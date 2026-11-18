import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { appAccountsByEmail } from '@/src/lib/accounts'
import { softDeleteCustomer } from '@/src/lib/soft-delete'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer
    .where({ id })
    .include('vehicles', (v) => v.where((x) => x.deletedAt.isNull()))
    .first()

  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  const appAccount = customer.email ? (await appAccountsByEmail([customer.email])).get(customer.email.toLowerCase()) ?? null : null
  return Response.json({ data: { ...customer, appAccount } })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.Customer.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { name, phone, email, address, notes } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates['name'] = String(name).trim()
  if (phone !== undefined) updates['phone'] = String(phone).trim()
  if (email !== undefined) updates['email'] = email ? String(email).trim() : null
  if (address !== undefined) updates['address'] = address ? String(address).trim() : null
  if (notes !== undefined) updates['notes'] = notes ? String(notes).trim() : null

  const customer = await db.orm.public.Customer.where({ id }).update(updates)
  return Response.json({ data: customer })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  // No se borra: queda como eliminado (con su historial) y se puede restaurar
  const { id } = await ctx.params
  const result = await softDeleteCustomer(id, g.session.user.id)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json({ data: { deleted: true } })
}
