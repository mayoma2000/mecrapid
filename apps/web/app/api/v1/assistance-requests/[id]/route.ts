import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { customerUserIds, notifyLater } from '@/src/lib/notify'

const STATUS_MESSAGE: Record<string, { title: string; body: string }> = {
  active:    { title: '🛠️ Atendimos tu solicitud', body: 'El taller ya está atendiendo tu solicitud de asistencia.' },
  completed: { title: '✅ Asistencia completada', body: 'Tu solicitud de asistencia fue completada.' },
  cancelled: { title: 'Solicitud cancelada', body: 'Tu solicitud de asistencia fue cancelada. Llamanos si tenés dudas.' },
  pending:   { title: 'Solicitud reactivada', body: 'Tu solicitud de asistencia volvió a estar pendiente.' },
}

// Avisa al cliente cuando el taller cambia el estado de su solicitud
function notifyCustomer(customerId: string | null, status: string) {
  const msg = STATUS_MESSAGE[status]
  if (!customerId || !msg) return
  notifyLater(() => customerUserIds(customerId), { type: `assistance_${status}`, ...msg, url: '/' })
}

type Ctx = { params: Promise<{ id: string }> }

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
    .first()

  if (!req) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: req })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const existing = await db.orm.public.AssistanceRequest
    .where({ id })
    .include('customer')
    .first()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { action, status } = body

  // Activate: create WorkOrder and link it
  if (action === 'activate') {
    if (existing.workOrderId) {
      return Response.json({ error: 'Already activated' }, { status: 409 })
    }

    const customerId = existing.customerId
    if (!customerId) {
      return Response.json({ error: 'No customer linked to this request' }, { status: 422 })
    }

    const workOrder = await db.orm.public.WorkOrder.create({
      customerId,
      vehicleId: existing.vehicleId ?? null,
      complaint: existing.detail,
      notes: `Solicitud de asistencia #${id.slice(0, 8).toUpperCase()}`,
    })

    const updated = await db.orm.public.AssistanceRequest
      .where({ id })
      .update({ status: 'active', workOrderId: workOrder.id })

    notifyCustomer(customerId, 'active')
    return Response.json({ data: updated })
  }

  // Generic status update
  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates['status'] = status

  const updated = await db.orm.public.AssistanceRequest.where({ id }).update(updates)
  if (status && status !== existing.status) notifyCustomer(existing.customerId, status)
  return Response.json({ data: updated })
}
