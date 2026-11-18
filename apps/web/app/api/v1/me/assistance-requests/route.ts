import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'
import { parsePaging } from '@/src/lib/paging'
import { ownVehicle } from '@/src/lib/me'
import { adminUserIds, notifyLater } from '@/src/lib/notify'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()
  if (customers.length === 0) return Response.json({ data: [], meta: { total: 0 } })

  // Solicitudes del cliente, más recientes primero. ?limit=&offset= para paginar
  const { limit, offset } = parsePaging(request)
  const base = db.orm.public.AssistanceRequest.where({ customerId: customers[0]!.id })
  const [requests, agg] = await Promise.all([
    limit == null
      ? base.include('assistanceType').include('vehicle').orderBy((r) => r.createdAt.desc()).all()
      : base.include('assistanceType').include('vehicle').orderBy((r) => r.createdAt.desc()).limit(limit).offset(offset).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: requests, meta: { total: agg.count, offset } })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { assistanceTypeId, detail, phone, latitude, longitude, vehicleId } = body

  if (!detail || !phone) {
    return Response.json({ error: 'detail and phone are required' }, { status: 400 })
  }

  // Find or create Customer record for this user
  let customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) {
    const newCustomer = await db.orm.public.Customer.create({
      name: session.user.name,
      email: session.user.email,
      phone: String(phone).trim(),
    })
    customers = [newCustomer]
  }

  const customer = customers[0]!

  // En una emergencia el vehículo es opcional ("es otro carro"); si viene, tiene que ser suyo
  if (vehicleId && !(await ownVehicle(customer.id, String(vehicleId)))) {
    return Response.json({ error: 'Ese vehículo no está en tu cuenta' }, { status: 400 })
  }

  const assistanceRequest = await db.orm.public.AssistanceRequest.create({
    customerId: customer.id,
    assistanceTypeId: assistanceTypeId ? String(assistanceTypeId) : null,
    detail: String(detail).trim(),
    phone: String(phone).trim(),
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    vehicleId: vehicleId ? String(vehicleId) : null,
  })

  const typeName = assistanceRequest.assistanceTypeId
    ? (await db.orm.public.AssistanceType.first({ id: assistanceRequest.assistanceTypeId }))?.name
    : null
  notifyLater(adminUserIds, {
    type: 'assistance_new',
    title: '🆘 Nueva solicitud de asistencia',
    body: `${customer.name}${typeName ? ` · ${typeName}` : ''}: ${assistanceRequest.detail}`.slice(0, 180),
    url: `/(tabs)/assistance/${assistanceRequest.id}`,
  })
  return Response.json({ data: assistanceRequest }, { status: 201 })
}
