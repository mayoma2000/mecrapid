import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { summarizeLogs, bumpVehicleMileage } from '@/src/lib/job-time'
import { customerUserIds, notifyLater, vehicleLabel } from '@/src/lib/notify'

type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'
type Ctx = { params: Promise<{ id: string }> }

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending:       ['assigned', 'cancelled'],
  assigned:      ['in_progress', 'cancelled'],
  in_progress:   ['quality_check', 'cancelled'],
  quality_check: ['completed', 'in_progress'],
  completed:     [],
  cancelled:     [],
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const order = await db.orm.public.WorkOrder
    .where({ id })
    .include('customer')
    .include('vehicle')
    .include('serviceItems')
    .include('partItems')
    .include('mechanic')
    .include('timeLogs')
    .first()

  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
  const timeLogs = [...order.timeLogs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  return Response.json({ data: { ...order, timeLogs, ...summarizeLogs(timeLogs) } })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.WorkOrder.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { status, mechanicId, diagnosis, estimatedCost, actualCost, notes, mileageIn, vehicleId } = body

  if (status && status !== existing.status) {
    const allowed = STATUS_TRANSITIONS[existing.status as WorkOrderStatus] ?? []
    if (!allowed.includes(status)) {
      return Response.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 422 },
      )
    }
  }

  const updates: Record<string, unknown> = {}

  // Vehículo: tiene que ser uno del cliente de la orden
  if (vehicleId !== undefined) {
    if (!vehicleId) return Response.json({ error: 'Elegí un vehículo' }, { status: 400 })
    const vehicle = await db.orm.public.Vehicle.first({ id: String(vehicleId) })
    if (!vehicle || vehicle.customerId !== existing.customerId || vehicle.deletedAt) {
      return Response.json({ error: 'Ese vehículo no es del cliente de la orden' }, { status: 400 })
    }
    updates['vehicleId'] = vehicle.id
  }

  // Sin vehículo no se termina: el historial, el km y los recordatorios dependen del carro
  if ((status === 'quality_check' || status === 'completed') && !existing.vehicleId && !updates['vehicleId']) {
    return Response.json({ error: 'Asigná el vehículo a la orden antes de terminarla' }, { status: 422 })
  }

  // Asignar mecánico: el admin asigna a cualquiera; un mecánico solo puede tomar
  // una orden libre para sí mismo
  if (mechanicId !== undefined && (mechanicId || null) !== existing.mechanicId) {
    if (g.role === 'mecanico' && (existing.mechanicId || mechanicId !== g.session.user.id)) {
      return Response.json({ error: 'Solo el administrador puede reasignar órdenes' }, { status: 403 })
    }
    if (mechanicId) {
      const mech = await db.orm.public.User.first({ id: String(mechanicId) })
      if (!mech || mech.role !== 'mecanico' || mech.banned) {
        return Response.json({ error: 'Mecánico no válido' }, { status: 400 })
      }
    }
    updates['mechanicId'] = mechanicId || null
    // Asignar mueve la orden de pendiente a asignada (y al revés si se desasigna)
    if (status === undefined) {
      if (mechanicId && existing.status === 'pending') updates['status'] = 'assigned'
      if (!mechanicId && existing.status === 'assigned') updates['status'] = 'pending'
    }
  }

  if (status !== undefined) {
    updates['status'] = status
    if (status === 'completed') updates['completedAt'] = new Date().toISOString()
  }
  if (diagnosis !== undefined) updates['diagnosis'] = diagnosis || null
  if (estimatedCost !== undefined) updates['estimatedCost'] = estimatedCost != null ? Number(estimatedCost) : null
  if (actualCost !== undefined) updates['actualCost'] = actualCost != null ? Number(actualCost) : null
  if (notes !== undefined) updates['notes'] = notes || null
  if (mileageIn !== undefined) updates['mileageIn'] = mileageIn != null && mileageIn !== '' ? Math.round(Number(mileageIn)) : null

  // Al cerrar la orden se detiene cualquier cronómetro que siga corriendo
  if (status === 'completed' || status === 'cancelled') {
    await db.orm.public.WorkOrderTimeLog
      .where({ workOrderId: id })
      .where((l) => l.endedAt.isNull())
      .updateAll({ endedAt: new Date().toISOString() })
  }

  const order = await db.orm.public.WorkOrder.where({ id }).update(updates)
  if (updates['mileageIn'] != null) await bumpVehicleMileage(db, existing.vehicleId, updates['mileageIn'] as number)

  if ((status === 'completed' || status === 'cancelled') && status !== existing.status) {
    const vehicle = existing.vehicleId ? await db.orm.public.Vehicle.first({ id: existing.vehicleId }) : null
    notifyLater(() => customerUserIds(existing.customerId), status === 'completed'
      ? { type: 'order_completed', title: '🚗 ¡Tu carro está listo!', body: `Ya podés pasar a recoger ${vehicleLabel(vehicle)}.`, url: '/' }
      : { type: 'order_cancelled', title: 'Orden cancelada', body: `La orden de ${vehicleLabel(vehicle)} fue cancelada. Llamanos si tenés dudas.`, url: '/' })
  }
  return Response.json({ data: order })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.WorkOrder.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!['pending', 'cancelled'].includes(existing.status as string)) {
    return Response.json(
      { error: 'Only pending or cancelled orders can be deleted' },
      { status: 422 },
    )
  }

  await db.orm.public.WorkOrder.where({ id }).delete()
  return new Response(null, { status: 204 })
}
