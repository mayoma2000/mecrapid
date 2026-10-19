import { auth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const customerId = searchParams.get('customerId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '50')))

  let base = db.orm.public.Appointment as typeof db.orm.public.Appointment

  if (from) base = base.where((a) => a.scheduledAt.gte(new Date(from).toISOString())) as typeof base
  if (to) base = base.where((a) => a.scheduledAt.lte(new Date(to).toISOString())) as typeof base
  if (customerId) base = base.where({ customerId }) as typeof base

  const [appointments, agg] = await Promise.all([
    base
      .include('customer')
      .include('vehicle')
      .orderBy((a) => a.scheduledAt.asc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: appointments, meta: { total: agg.count, page, limit } })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { customerId, vehicleId, scheduledAt, serviceType, duration, notes } = body

  if (!customerId || !scheduledAt || !serviceType) {
    return Response.json(
      { error: 'customerId, scheduledAt and serviceType are required' },
      { status: 400 },
    )
  }

  const appointment = await db.orm.public.Appointment.create({
    customerId: String(customerId),
    vehicleId: vehicleId ? String(vehicleId) : null,
    scheduledAt: new Date(scheduledAt).toISOString(),
    serviceType: String(serviceType).trim(),
    duration: duration != null ? Number(duration) : 60,
    notes: notes ? String(notes).trim() : null,
  })

  return Response.json({ data: appointment }, { status: 201 })
}
