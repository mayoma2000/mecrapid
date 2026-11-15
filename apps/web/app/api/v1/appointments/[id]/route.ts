import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { customerUserIds, hnDateTime, notifyLater } from '@/src/lib/notify'
import { toDate } from '@/src/lib/job-time'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const appointment = await db.orm.public.Appointment
    .where({ id })
    .include('customer')
    .include('vehicle')
    .first()

  if (!appointment) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: appointment })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const existing = await db.orm.public.Appointment.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { status, scheduledAt, serviceType, duration, notes, vehicleId } = body

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates['status'] = status
  if (scheduledAt !== undefined) updates['scheduledAt'] = new Date(scheduledAt).toISOString()
  if (serviceType !== undefined) updates['serviceType'] = String(serviceType).trim()
  if (duration !== undefined) updates['duration'] = Number(duration)
  if (notes !== undefined) updates['notes'] = notes || null
  if (vehicleId !== undefined) updates['vehicleId'] = vehicleId || null

  const appointment = await db.orm.public.Appointment.where({ id }).update(updates)

  if (appointment) {
    const when = hnDateTime(appointment.scheduledAt)
    const url = `/my-appointment/${id}`
    const notify = (type: string, title: string, body: string) =>
      notifyLater(() => customerUserIds(existing.customerId), { type, title, body, url })
    if (updates['scheduledAt'] && updates['scheduledAt'] !== toDate(existing.scheduledAt).toISOString()) {
      notify('appointment_rescheduled', '📅 Tu cita fue reprogramada', `Nueva fecha: ${when}`)
    } else if (status === 'confirmed' && existing.status !== 'confirmed') {
      notify('appointment_confirmed', '✅ Tu cita está confirmada', `${appointment.serviceType} · ${when}`)
    } else if (status === 'cancelled' && existing.status !== 'cancelled') {
      notify('appointment_cancelled', 'Tu cita fue cancelada', `La cita del ${when} fue cancelada. Podés agendar otra desde la app.`)
    }
  }
  return Response.json({ data: appointment })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const existing = await db.orm.public.Appointment.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.orm.public.Appointment.where({ id }).delete()
  return new Response(null, { status: 204 })
}
