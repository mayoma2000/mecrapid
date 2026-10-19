import { auth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/v1/customers/[id]'>) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer
    .where({ id })
    .include({ vehicles: true })
    .first()

  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: customer })
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/customers/[id]'>) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()
  const { name, phone, email, address, notes } = body

  const customer = await db.orm.public.Customer
    .where({ id })
    .update({
      ...(name !== undefined && { name: String(name).trim() }),
      ...(phone !== undefined && { phone: String(phone).trim() }),
      ...(email !== undefined && { email: email ? String(email).trim() : null }),
      ...(address !== undefined && { address: address ? String(address).trim() : null }),
      ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
    })
    .first()

  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: customer })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/v1/customers/[id]'>) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer.where({ id }).delete().first()
  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: customer })
}
