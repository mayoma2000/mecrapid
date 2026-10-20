import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json() as { status?: string }

  // Only allow clients to cancel their own appointments
  if (body.status !== 'cancelled') {
    return Response.json({ error: 'Only cancellation is allowed' }, { status: 400 })
  }

  // Find the customer
  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })

  const customer = customers[0]!

  // Verify the appointment belongs to this customer
  const appt = await db.orm.public.Appointment.first({ id, customerId: customer.id })
  if (!appt) return Response.json({ error: 'Not found' }, { status: 404 })

  // Can only cancel if not already completed or cancelled
  if (appt.status === 'completed' || appt.status === 'cancelled') {
    return Response.json({ error: 'Esta cita ya no se puede cancelar' }, { status: 400 })
  }

  const updated = await db.orm.public.Appointment.where({ id }).update({ status: 'cancelled' })
  return Response.json({ data: updated })
}
