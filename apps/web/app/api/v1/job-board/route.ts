import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { summarizeLogs } from '@/src/lib/job-time'

const OPEN_STATUSES = ['pending', 'assigned', 'in_progress', 'quality_check'] as const

// Tablero de trabajo: órdenes abiertas agrupadas por mecánico, con tiempo trabajado
// y si el cronómetro está corriendo. Las sin mecánico van en `unassigned`.
export async function GET() {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const [orders, mechanics] = await Promise.all([
    db.orm.public.WorkOrder
      .where((o) => o.status.in([...OPEN_STATUSES]))
      .include('customer')
      .include('vehicle')
      .include('timeLogs')
      .orderBy((o) => o.createdAt.asc())
      .all(),
    db.orm.public.User
      .where((u) => u.role.eq('mecanico'))
      .orderBy((u) => u.name.asc())
      .all(),
  ])

  const cards = orders.map((o) => ({
    id: o.id,
    status: o.status,
    complaint: o.complaint,
    createdAt: o.createdAt,
    startedAt: o.startedAt,
    mechanicId: o.mechanicId,
    customer: o.customer ? { id: o.customer.id, name: o.customer.name } : null,
    vehicle: o.vehicle
      ? { make: o.vehicle.make, model: o.vehicle.model, year: o.vehicle.year, licensePlate: o.vehicle.licensePlate }
      : null,
    ...summarizeLogs(o.timeLogs),
  }))

  const columns = mechanics
    .filter((m) => !m.banned || cards.some((c) => c.mechanicId === m.id))
    .map((m) => {
      const mine = cards.filter((c) => c.mechanicId === m.id)
      return {
        mechanic: { id: m.id, name: m.name, phone: m.phone, active: !m.banned },
        working: mine.some((c) => c.runningSince),
        orders: mine,
      }
    })

  return Response.json({
    data: {
      columns,
      unassigned: cards.filter((c) => !c.mechanicId),
      serverTime: new Date().toISOString(),
    },
  })
}
