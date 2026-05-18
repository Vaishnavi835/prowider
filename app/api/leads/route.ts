import { NextRequest, NextResponse } from 'next/server'
import { createLeadAndAllocate } from '@/lib/allocate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, city, serviceId, description } = body

    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    // Fix #3: Lead creation and allocation now happen in one atomic transaction.
    const { leadId, assignedProviders } = await createLeadAndAllocate({
      name,
      phone,
      city,
      serviceId: Number(serviceId),
      description,
    })

    return NextResponse.json({ success: true, leadId, assignedProviders })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    
    // Handle database-level duplicate constraint
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already submitted a lead for this service.' },
        { status: 409 }
      )
    }

    // Fix #1: Handle strict 3-provider guarantee failure
    if (err.message && err.message.includes('Insufficient providers')) {
      return NextResponse.json(
        { error: 'All providers are currently full. Please try again later.' },
        { status: 422 }
      )
    }

    console.error('[POST /api/leads]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
