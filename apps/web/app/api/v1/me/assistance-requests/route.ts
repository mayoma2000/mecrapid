import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'

export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) return Response.json({ data: [], meta: { total: 0 } })

  const customer = customers[0]!
  const requests = await db.orm.public.AssistanceRequest
    .where({ customerId: customer.id })
    .include('assistanceType')
    .orderBy((r) => r.createdAt.desc())
    .all()

  return Response.json({ data: requests, meta: { total: requests.length } })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { assistanceTypeId, detail, phone, latitude, longitude } = body

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

  const assistanceRequest = await db.orm.public.AssistanceRequest.create({
    customerId: customer.id,
    assistanceTypeId: assistanceTypeId ? String(assistanceTypeId) : null,
    detail: String(detail).trim(),
    phone: String(phone).trim(),
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
  })

  return Response.json({ data: assistanceRequest }, { status: 201 })
}
