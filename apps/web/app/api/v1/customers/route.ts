import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { appAccountsByEmail } from '@/src/lib/accounts'

export async function GET(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  // Por defecto solo activos; ?deleted=1 muestra los eliminados (para restaurarlos)
  const deleted = searchParams.get('deleted') === '1'
  const scoped = deleted
    ? db.orm.public.Customer.where((c) => c.deletedAt.isNotNull())
    : db.orm.public.Customer.where((c) => c.deletedAt.isNull())
  const base = search ? scoped.where((c) => c.name.ilike(`%${search}%`)) : scoped

  const [customers, agg] = await Promise.all([
    base.orderBy((c) => c.createdAt.desc()).limit(limit).offset((page - 1) * limit).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  // ¿Tiene cuenta en la app? (mismo correo)
  const accounts = await appAccountsByEmail(customers.map((c) => c.email))
  const data = customers.map((c) => {
    const acc = c.email ? accounts.get(c.email.toLowerCase()) : undefined
    return { ...c, appAccount: acc ? { active: acc.active, role: acc.role } : null }
  })

  return Response.json({ data, meta: { total: agg.count, page, limit } })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

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
