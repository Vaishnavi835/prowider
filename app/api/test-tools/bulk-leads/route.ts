import { NextResponse } from 'next/server'
import { createLeadAndAllocate } from '@/lib/allocate'

export async function POST() {
  const timestamp = Date.now()

  // Concurrency Test: Triggering 10 parallel requests.
  // The SELECT FOR UPDATE inside createLeadAndAllocate ensures safe execution 
  // without race conditions, and if quotas exhaust, the atomic transaction 
  // safely rolls back the overflowing requests.
  const results = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      try {
        const serviceId = (i % 3) + 1
        
        const { leadId, assignedProviders } = await createLeadAndAllocate({
          name: `Test User ${i + 1}`,
          phone: `TEST${timestamp}${i}`,
          city: 'Test City',
          serviceId,
          description: 'Bulk concurrency test lead'
        })
        
        return { success: true, leadId, serviceId, assignedProviders }
      } catch (e: unknown) {
        const err = e as { message?: string }
        return { success: false, error: err.message || 'Unknown error' }
      }
    })
  )

  return NextResponse.json({
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  })
}
