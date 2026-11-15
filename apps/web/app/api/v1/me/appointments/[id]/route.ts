import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'

type Ctx = { params: Promise<{ id: string }> }

const CLOSED_STATUSES = ['completed', 'cancelled', 'no_show']

// Returns the appointment only if it belongs to the session user's Customer record
async function findOwnAppointment(email: string, id: string) {
  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(email))
    .limit(1)
    .all()

  if (customers.length === 0) return null
  return db.orm.public.Appointment.first({ id, customerId: customers[0]!.id })
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const appt = await findOwnAppointment(session.user.email, id)
  if (!appt) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ data: appt })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json() as { status?: string; scheduledAt?: string; serviceType?: string; notes?: string | null }

  const appt = await findOwnAppointment(session.user.email, id)
  if (!appt) return Response.json({ error: 'Not found' }, { status: 404 })

  if (CLOSED_STATUSES.includes(appt.status)) {
    return Response.json({ error: 'Esta cita ya no se puede modificar' }, { status: 400 })
  }

  // Clients can cancel their own appointments
  if (body.status === 'cancelled') {
    const updated = await db.orm.public.Appointment.where({ id }).update({ status: 'cancelled' })
    return Response.json({ data: updated })
  }

  // ...or reschedule them; the workshop has to confirm again
  if (body.status === undefined && body.scheduledAt) {
    const scheduledAt = new Date(body.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime())) {
      return Response.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return Response.json({ error: 'La nueva fecha debe ser futura' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
    }
    if (body.serviceType) updates['serviceType'] = String(body.serviceType).trim()
    if (body.notes !== undefined) updates['notes'] = body.notes ? String(body.notes).trim() : null

    const updated = await db.orm.public.Appointment.where({ id }).update(updates)
    return Response.json({ data: updated })
  }

  return Response.json({ error: 'Only cancellation or rescheduling is allowed' }, { status: 400 })
}
