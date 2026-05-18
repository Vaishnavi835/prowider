import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { idempotencyKey, providerId } = await req.json()

    if (!idempotencyKey) {
      return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // This will throw P2002 if key already exists — atomic idempotency check
      await tx.webhookIdempotencyKey.create({
        data: { idempotencyKey }
      })

      // Only runs if key was new (not a duplicate)
      if (providerId) {
        await tx.provider.update({
          where: { id: Number(providerId) },
          data: { leadsReceivedCount: 0 }
        })
      } else {
        await tx.provider.updateMany({
          data: { leadsReceivedCount: 0 }
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Quota reset successfully' })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({
        success: true,
        message: 'Already processed — no action taken (idempotent)'
      })
    }
    console.error('[POST /api/webhook/reset-quota]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
