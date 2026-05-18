import { PrismaClient } from '@prisma/client'

/**
 * FIX #2: PRISMACLIENT SINGLETON PATTERN
 * 
 * In Next.js (especially during development with Hot Module Replacement) and 
 * Serverless environments (like Vercel), files are frequently re-executed. 
 * If we instantiate `new PrismaClient()` in every file, we will quickly 
 * exhaust the database connection pool (Too many connections error).
 * 
 * This singleton pattern attaches the Prisma instance to the global object 
 * which persists across hot reloads. It ensures exactly ONE connection pool 
 * is maintained per Node process, providing high backend reliability.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
