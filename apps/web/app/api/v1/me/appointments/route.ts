import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { serviceType, scheduledAt, notes } = body

  if (!serviceType || !scheduledAt) {
    return Response.json({ error: 'serviceType and scheduledAt are required' }, { status: 400 })
  }

  // Find or create Customer record
  let customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) {
    const newCustomer = await db.orm.public.Customer.create({
      name: session.user.name,
      email: session.user.email,
      phone: '',
    })
    customers = [newCustomer]
  }

  const customer = customers[0]!

  const appointment = await db.orm.public.Appointment.create({
    customerId: customer.id,
    vehicleId: null,
    scheduledAt: new Date(scheduledAt).toISOString(),
    serviceType: String(serviceType).trim(),
    notes: notes ? String(notes).trim() : null,
  })

  return Response.json({ data: appointment }, { status: 201 })
}

export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) {
    return Response.json({ data: [], meta: { total: 0 } })
  }

  const customer = customers[0]!

  const appointments = await db.orm.public.Appointment
    .where((a) => a.customerId.eq(customer.id))
    .orderBy((a) => a.scheduledAt.desc())
    .all()

  return Response.json({ data: appointments, meta: { total: appointments.length } })
}
