import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { customerUserIds, notifyLater, vehicleLabel } from '@/src/lib/notify'

type Ctx = { params: Promise<{ id: string }> }
type Action = 'start' | 'pause' | 'finish'

// Cronómetro del mecánico sobre una orden:
//   start  → abre un tramo (pausa cualquier otro trabajo que tuviera corriendo) y pone la orden "en proceso"
//   pause  → cierra el tramo abierto; la orden sigue en proceso
//   finish → cierra el tramo y pasa la orden a "control de calidad"
// El mecánico solo opera sus órdenes; el admin puede operar cualquiera en nombre del mecánico asignado.
export async function POST(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const { action } = await request.json() as { action?: Action }
  if (action !== 'start' && action !== 'pause' && action !== 'finish') {
    return Response.json({ error: 'action debe ser start, pause o finish' }, { status: 400 })
  }

  const order = await db.orm.public.WorkOrder.first({ id })
  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })

  const me = g.session.user.id
  if (g.role === 'mecanico' && order.mechanicId && order.mechanicId !== me) {
    return Response.json({ error: 'Esta orden está asignada a otro mecánico' }, { status: 403 })
  }
  const mechanicId = order.mechanicId ?? (g.role === 'mecanico' ? me : null)
  if (!mechanicId) {
    return Response.json({ error: 'Asigná un mecánico a la orden antes de iniciar el trabajo' }, { status: 422 })
  }

  const now = new Date().toISOString()
  const closeOpenLogs = () =>
    db.orm.public.WorkOrderTimeLog
      .where({ workOrderId: id })
      .where((l) => l.endedAt.isNull())
      .updateAll({ endedAt: now })

  if (action === 'start') {
    if (!['pending', 'assigned', 'in_progress', 'quality_check'].includes(order.status)) {
      return Response.json({ error: 'La orden ya está cerrada' }, { status: 422 })
    }
    const running = await db.orm.public.WorkOrderTimeLog
      .where({ workOrderId: id })
      .where((l) => l.endedAt.isNull())
      .first()
    if (!running) {
      // Un mecánico trabaja un carro a la vez: pausa lo que tuviera abierto en otra orden
      await db.orm.public.WorkOrderTimeLog
        .where({ mechanicId })
        .where((l) => l.endedAt.isNull())
        .updateAll({ endedAt: now })
      await db.orm.public.WorkOrderTimeLog.create({ workOrderId: id, mechanicId, startedAt: now })
    }
    await db.orm.public.WorkOrder.where({ id }).update({
      status: 'in_progress',
      mechanicId,
      ...(order.startedAt ? {} : { startedAt: now }),
    })
    if (!order.startedAt) {
      const vehicle = order.vehicleId ? await db.orm.public.Vehicle.first({ id: order.vehicleId }) : null
      notifyLater(() => customerUserIds(order.customerId), {
        type: 'order_started',
        title: '🔧 Empezamos a trabajar en tu carro',
        body: `Un mecánico ya está trabajando en ${vehicleLabel(vehicle)}. Te avisamos cuando esté listo.`,
        url: '/',
      })
    }
  } else if (action === 'pause') {
    await closeOpenLogs()
  } else {
    if (order.status !== 'in_progress') {
      return Response.json({ error: 'Solo se puede terminar una orden en proceso' }, { status: 422 })
    }
    if (!order.vehicleId) {
      return Response.json({ error: 'Asigná el vehículo a la orden antes de terminarla' }, { status: 422 })
    }
    await closeOpenLogs()
    await db.orm.public.WorkOrder.where({ id }).update({ status: 'quality_check' })
  }

  const updated = await db.orm.public.WorkOrder.where({ id }).include('timeLogs').first()
  return Response.json({ data: updated })
}
