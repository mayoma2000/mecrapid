import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { bumpVehicleMileage } from '@/src/lib/job-time'

type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'
const ACTIVE_STATUSES: WorkOrderStatus[] = ['assigned', 'in_progress', 'quality_check']

export async function GET(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const customerId = searchParams.get('customerId')
  const mechanicId = searchParams.get('mine') === '1' ? g.session.user.id : searchParams.get('mechanicId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  let base = db.orm.public.WorkOrder as typeof db.orm.public.WorkOrder

  if (status === 'active') {
    base = base.where((o) => o.status.in(ACTIVE_STATUSES)) as typeof base
  } else if (status) {
    base = base.where({ status: status as WorkOrderStatus }) as typeof base
  }

  if (customerId) {
    base = base.where({ customerId }) as typeof base
  }
  if (mechanicId) {
    base = base.where({ mechanicId }) as typeof base
  }

  const [orders, agg] = await Promise.all([
    base
      .include('customer')
      .include('vehicle')
      .include('mechanic')
      .orderBy((o) => o.createdAt.desc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: orders, meta: { total: agg.count, page, limit } })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const body = await request.json()
  const { customerId, vehicleId, complaint, diagnosis, mechanicId, estimatedCost, notes, mileageIn } = body

  if (!customerId || !vehicleId || !complaint) {
    return Response.json(
      { error: 'customerId, vehicleId and complaint are required' },
      { status: 400 },
    )
  }

  if (mechanicId) {
    const mech = await db.orm.public.User.first({ id: String(mechanicId) })
    if (!mech || mech.role !== 'mecanico' || mech.banned) {
      return Response.json({ error: 'Mecánico no válido' }, { status: 400 })
    }
  }

  const order = await db.orm.public.WorkOrder.create({
    customerId: String(customerId),
    vehicleId: String(vehicleId),
    complaint: String(complaint).trim(),
    diagnosis: diagnosis ? String(diagnosis).trim() : null,
    mechanicId: mechanicId ? String(mechanicId) : null,
    status: mechanicId ? 'assigned' : 'pending',
    mileageIn: mileageIn != null && mileageIn !== '' ? Math.round(Number(mileageIn)) : null,
    estimatedCost: estimatedCost != null ? Number(estimatedCost) : null,
    notes: notes ? String(notes).trim() : null,
  })

  await bumpVehicleMileage(db, order.vehicleId, order.mileageIn)
  return Response.json({ data: order }, { status: 201 })
}
