import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        assignments: {
          include: {
            lead: { include: { service: true } }
          },
          orderBy: { assignedAt: 'desc' }
        }
      },
      orderBy: { id: 'asc' }
    })

    return NextResponse.json(providers)
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
