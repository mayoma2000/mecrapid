import { auth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const customers = search
    ? await db.orm.public.Customer
        .where({ name: { contains: search, mode: 'insensitive' } })
        .orderBy({ createdAt: 'desc' })
        .skip((page - 1) * limit)
        .take(limit)
        .all()
    : await db.orm.public.Customer
        .orderBy({ createdAt: 'desc' })
        .skip((page - 1) * limit)
        .take(limit)
        .all()

  const total = await db.orm.public.Customer.count()

  return Response.json({ data: customers, meta: { total, page, limit } })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, phone, email, address, notes } = body

  if (!name || !phone) {
    return Response.json({ error: 'name and phone are required' }, { status: 400 })
  }

  const customer = await db.orm.public.Customer.create({
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim() : null,
    address: address ? String(address).trim() : null,
    notes: notes ? String(notes).trim() : null,
  })

  return Response.json({ data: customer }, { status: 201 })
}
