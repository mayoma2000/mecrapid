import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer
    .where({ id })
    .include('vehicles')
    .first()

  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: customer })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {

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

  const { id } = await ctx.params
  const existing = await db.orm.public.Customer.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.orm.public.Customer.where({ id }).delete()
  return new Response(null, { status: 204 })
}
