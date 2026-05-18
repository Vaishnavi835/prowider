import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({})

async function main() {
  // Clear existing data
  await prisma.webhookIdempotencyKey.deleteMany()
  await prisma.leadAssignment.deleteMany()
  await prisma.allocationState.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.provider.deleteMany()
  await prisma.service.deleteMany()

  // Create 3 services
  const s1 = await prisma.service.create({ data: { name: 'Service 1' } })
  const s2 = await prisma.service.create({ data: { name: 'Service 2' } })
  const s3 = await prisma.service.create({ data: { name: 'Service 3' } })

  // Create 8 providers
  for (let i = 1; i <= 8; i++) {
    await prisma.provider.create({
      data: { name: `Provider ${i}`, monthlyQuota: 10 }
    })
  }

  // Service 1 pool: Providers 2, 3, 4
  for (const pid of [2, 3, 4]) {
    await prisma.allocationState.create({
      data: { serviceId: s1.id, providerId: pid, turnCounter: 0 }
    })
  }

  // Service 2 pool: Providers 6, 7, 8
  for (const pid of [6, 7, 8]) {
    await prisma.allocationState.create({
      data: { serviceId: s2.id, providerId: pid, turnCounter: 0 }
    })
  }

  // Service 3 pool: Providers 2, 3, 5, 6, 7, 8
  for (const pid of [2, 3, 5, 6, 7, 8]) {
    await prisma.allocationState.create({
      data: { serviceId: s3.id, providerId: pid, turnCounter: 0 }
    })
  }

  console.log('✅ Seed complete — 3 services, 8 providers, allocation states initialized')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
