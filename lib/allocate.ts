import { prisma } from './prisma'

// Mandatory provider rules per service ID
const MANDATORY: Record<number, number[]> = {
  1: [1],     // Service 1 → Provider 1 always
  2: [5],     // Service 2 → Provider 5 always
  3: [1, 4],  // Service 3 → Provider 1 AND Provider 4 always
}

// Fair pool providers per service ID
const POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
}

interface LeadData {
  name: string
  phone: string
  city: string
  serviceId: number
  description: string
}

/**
 * FIX #3: FULL TRANSACTIONAL CONSISTENCY
 * Wraps Lead creation, mandatory assignment, round-robin allocation, 
 * assignment creation, and quota increments in ONE ACID transaction.
 * 
 * If ANY step fails (e.g. unique constraint violation on lead creation, 
 * or insufficient providers), the entire transaction rolls back automatically.
 * No orphan leads, no partial allocations, no dirty state.
 */
export async function createLeadAndAllocate(leadData: LeadData): Promise<{ leadId: number; assignedProviders: number[] }> {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the Lead
    // If phone+serviceId violates the unique constraint, P2002 is thrown and transaction rolls back.
    const lead = await tx.lead.create({
      data: leadData
    })

    const serviceId = leadData.serviceId
    const assigned: number[] = []

    // 2. Assign mandatory providers (skip if quota exhausted)
    const mandatoryIds = MANDATORY[serviceId] || []
    for (const pid of mandatoryIds) {
      const provider = await tx.provider.findUnique({ where: { id: pid } })
      if (provider && provider.leadsReceivedCount < provider.monthlyQuota) {
        assigned.push(pid)
      }
    }

    // 3. Fill remaining slots from pool using turn-counter round-robin
    const slotsNeeded = 3 - assigned.length
    const poolIds = POOL[serviceId] || []

    if (slotsNeeded > 0 && poolIds.length > 0) {
      // SELECT FOR UPDATE locks these rows — prevents race conditions
      // when multiple leads are created at the same time.
      const poolStates = await tx.$queryRaw<
        { id: number; providerId: number; turnCounter: number }[]
      >`
        SELECT id, "providerId", "turnCounter"
        FROM "AllocationState"
        WHERE "serviceId" = ${serviceId}
          AND "providerId" = ANY(${poolIds}::int[])
        ORDER BY "turnCounter" ASC, "providerId" ASC
        FOR UPDATE
      `

      if (poolStates.length > 0) {
        // FIX #5: TURN COUNTER NORMALIZATION
        // Over time, turnCounters will increase infinitely. 
        // We find the minimum counter in the pool and subtract it from all pool providers.
        // This keeps integers small while PRESERVING mathematical fairness,
        // because subtracting a constant from a sorted array preserves the sorting order.
        const minTurnCounter = poolStates[0].turnCounter
        const NORMALIZATION_THRESHOLD = 10000

        if (minTurnCounter > NORMALIZATION_THRESHOLD) {
          for (const state of poolStates) {
            state.turnCounter -= minTurnCounter // Update local memory state for the loop below
            await tx.allocationState.update({
              where: { id: state.id },
              data: { turnCounter: { decrement: minTurnCounter } }
            })
          }
        }
      }

      let filled = 0
      for (const state of poolStates) {
        if (filled >= slotsNeeded) break
        if (assigned.includes(state.providerId)) continue

        const provider = await tx.provider.findUnique({ where: { id: state.providerId } })
        if (!provider || provider.leadsReceivedCount >= provider.monthlyQuota) continue

        assigned.push(state.providerId)
        filled++

        // Increment turn counter for this provider
        await tx.allocationState.update({
          where: { id: state.id },
          data: { turnCounter: { increment: 1 } }
        })
      }
    }

    // FIX #1: STRICTLY GUARANTEE EXACTLY 3 PROVIDERS
    // Enforcing business rules at the transaction level.
    // If we fail to find 3 providers (e.g. all quotas exhausted), we throw an error.
    // This causes the entire Prisma transaction to roll back, meaning the Lead
    // is NOT created, quotas are NOT updated, and the user gets a clean failure response.
    if (assigned.length < 3) {
      throw new Error('Insufficient providers available to fulfill 3-provider assignment rule.')
    }

    // 4. Create assignment records and update provider counts
    for (const pid of assigned) {
      await tx.leadAssignment.create({
        data: { leadId: lead.id, providerId: pid }
      })
      await tx.provider.update({
        where: { id: pid },
        data: { leadsReceivedCount: { increment: 1 } }
      })
    }

    return { leadId: lead.id, assignedProviders: assigned }
  }, {
    maxWait: 15000, // Wait up to 15s to acquire a connection (Neon free tier connection pooling)
    timeout: 30000  // Allow up to 30s for the transaction to complete
  })
}
