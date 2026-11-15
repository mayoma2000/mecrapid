import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const type = await db.orm.public.AssistanceType.first({ id })
  if (!type) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: type })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.AssistanceType.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates['name'] = String(body.name).trim()
  if (body.description !== undefined) updates['description'] = body.description || null
  if (body.active !== undefined) updates['active'] = Boolean(body.active)

  const type = await db.orm.public.AssistanceType.where({ id }).update(updates)
  return Response.json({ data: type })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.AssistanceType.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.orm.public.AssistanceType.where({ id }).delete()
  return new Response(null, { status: 204 })
}
