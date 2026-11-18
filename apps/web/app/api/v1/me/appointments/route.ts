import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'
import { parsePaging } from '@/src/lib/paging'
import { ownVehicle } from '@/src/lib/me'
import { adminUserIds, hnDateTime, notifyLater } from '@/src/lib/notify'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { serviceType, scheduledAt, notes, vehicleId } = body

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

  // Toda cita es para un vehículo del cliente (lo elige o lo registra en la app)
  if (!vehicleId || !(await ownVehicle(customer.id, String(vehicleId)))) {
    return Response.json({ error: 'Elegí para qué vehículo es la cita' }, { status: 400 })
  }

  const appointment = await db.orm.public.Appointment.create({
    customerId: customer.id,
    vehicleId: String(vehicleId),
    scheduledAt: new Date(scheduledAt).toISOString(),
    serviceType: String(serviceType).trim(),
    notes: notes ? String(notes).trim() : null,
  })

  notifyLater(adminUserIds, {
    type: 'appointment_new',
    title: '📅 Nueva cita solicitada',
    body: `${customer.name} · ${appointment.serviceType} · ${hnDateTime(appointment.scheduledAt)}`,
    url: `/(tabs)/appointments/${appointment.id}`,
  })
  return Response.json({ data: appointment }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()
  if (customers.length === 0) return Response.json({ data: [], meta: { total: 0 } })

  // Citas del cliente, las más lejanas en el futuro primero. ?limit=&offset= para paginar
  const { limit, offset } = parsePaging(request)
  const base = db.orm.public.Appointment.where((a) => a.customerId.eq(customers[0]!.id))
  const [appointments, agg] = await Promise.all([
    limit == null
      ? base.include('vehicle').orderBy((a) => a.scheduledAt.desc()).all()
      : base.include('vehicle').orderBy((a) => a.scheduledAt.desc()).limit(limit).offset(offset).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: appointments, meta: { total: agg.count, offset } })
}
