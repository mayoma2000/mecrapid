import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { customerUserIds, notifyLater, vehicleLabel } from '@/src/lib/notify'

// La asistencia es atención AFUERA del taller (batería, llaves, grúa):
//   pending ─accept→ en_route ─attend→ attended        (+ cancelled, y reactivar a pending)
// No crea una orden por sí sola: "Llevar al taller" (create_order) la crea solo cuando el
// carro tiene que entrar al taller, sin cambiar el estado de la asistencia.

type Ctx = { params: Promise<{ id: string }> }
type Action = 'accept' | 'attend' | 'create_order'

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const req = await db.orm.public.AssistanceRequest
    .where({ id })
    .include('customer')
    .include('assistanceType')
    .include('workOrder')
    .include('vehicle')
    .include('mechanic')
    .first()

  if (!req) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: req })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const existing = await db.orm.public.AssistanceRequest.where({ id }).include('vehicle').first()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { action?: Action; status?: string; mechanicId?: string }
  const me = g.session.user.id
  const now = new Date().toISOString()
  const toCustomer = (type: string, title: string, msg: string) => {
    if (existing.customerId) notifyLater(() => customerUserIds(existing.customerId!), { type, title, body: msg, url: '/' })
  }

  // Aceptar y enviar a un mecánico: pending → en_route
  if (body.action === 'accept') {
    if (existing.status !== 'pending') return Response.json({ error: 'Solo se puede aceptar una solicitud pendiente' }, { status: 409 })
    // El admin asigna a cualquiera; un mecánico puede tomarla para sí
    const mechanicId = g.role === 'mecanico' ? me : body.mechanicId
    if (!mechanicId) return Response.json({ error: 'Elegí qué mecánico va' }, { status: 400 })
    const mechanic = await db.orm.public.User.first({ id: mechanicId })
    if (!mechanic || mechanic.role !== 'mecanico' || mechanic.banned) {
      return Response.json({ error: 'Mecánico no válido' }, { status: 400 })
    }

    const updated = await db.orm.public.AssistanceRequest.where({ id }).update({ status: 'en_route', mechanicId, enRouteAt: now })
    toCustomer('assistance_en_route', '🚗 Vamos en camino', `${mechanic.name} va hacia tu ubicación para ${vehicleLabel(existing.vehicle)}.`)
    if (mechanicId !== me) {
      notifyLater(async () => [mechanicId], {
        type: 'assistance_assigned',
        title: '🆘 Te asignaron una asistencia',
        body: existing.detail.slice(0, 160),
        url: '/(tabs)/job-board',
      })
    }
    return Response.json({ data: updated })
  }

  // Atendida en el lugar: en_route → attended (admin o el mecánico asignado)
  if (body.action === 'attend') {
    if (existing.status !== 'en_route') return Response.json({ error: 'Solo se puede marcar atendida una asistencia en camino' }, { status: 409 })
    if (g.role === 'mecanico' && existing.mechanicId !== me) {
      return Response.json({ error: 'Esta asistencia está asignada a otro mecánico' }, { status: 403 })
    }
    const updated = await db.orm.public.AssistanceRequest.where({ id }).update({ status: 'attended', attendedAt: now })
    toCustomer('assistance_attended', '✅ Asistencia atendida', 'Gracias por confiar en nosotros. Si tu carro necesita más trabajo, te esperamos en el taller.')
    return Response.json({ data: updated })
  }

  // Llevar al taller: crea la orden de trabajo (opcional) y la enlaza; el estado no cambia
  if (body.action === 'create_order') {
    if (existing.status === 'cancelled') return Response.json({ error: 'La solicitud está cancelada' }, { status: 409 })
    if (existing.workOrderId) return Response.json({ error: 'Ya tiene una orden de taller', data: { workOrderId: existing.workOrderId } }, { status: 409 })
    if (!existing.customerId) return Response.json({ error: 'La solicitud no tiene cliente' }, { status: 422 })

    const workOrder = await db.orm.public.WorkOrder.create({
      customerId: existing.customerId,
      vehicleId: existing.vehicleId ?? null,
      complaint: existing.detail,
      notes: `Viene de la asistencia #${id.slice(0, 8).toUpperCase()}`,
    })
    await db.orm.public.AssistanceRequest.where({ id }).update({ workOrderId: workOrder.id })
    return Response.json({ data: { workOrderId: workOrder.id } }, { status: 201 })
  }

  // Cancelar (pendiente o en camino) / reactivar una cancelada
  if (body.status === 'cancelled') {
    if (existing.status !== 'pending' && existing.status !== 'en_route') {
      return Response.json({ error: 'Solo se cancela una solicitud pendiente o en camino' }, { status: 409 })
    }
    const updated = await db.orm.public.AssistanceRequest.where({ id }).update({ status: 'cancelled' })
    toCustomer('assistance_cancelled', 'Solicitud cancelada', 'Tu solicitud de asistencia fue cancelada. Llamanos si tenés dudas.')
    return Response.json({ data: updated })
  }
  if (body.status === 'pending') {
    if (existing.status !== 'cancelled') return Response.json({ error: 'Solo se reactiva una solicitud cancelada' }, { status: 409 })
    const updated = await db.orm.public.AssistanceRequest.where({ id }).update({ status: 'pending', mechanicId: null, enRouteAt: null })
    toCustomer('assistance_pending', 'Solicitud reactivada', 'Tu solicitud de asistencia volvió a estar pendiente.')
    return Response.json({ data: updated })
  }

  return Response.json({ error: 'Acción no válida' }, { status: 400 })
}
