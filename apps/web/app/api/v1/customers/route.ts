import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

export async function GET(request: NextRequest) {

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const base = search
    ? db.orm.public.Customer.where((c) => c.name.ilike(`%${search}%`))
    : db.orm.public.Customer

  const [customers, agg] = await Promise.all([
    base.orderBy((c) => c.createdAt.desc()).limit(limit).offset((page - 1) * limit).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: customers, meta: { total: agg.count, page, limit } })
}

export async function POST(request: NextRequest) {

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
