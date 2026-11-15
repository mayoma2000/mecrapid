import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { parseRule, type RuleInput } from '@/src/lib/maintenance'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.MaintenanceRule.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const parsed = parseRule(await request.json() as RuleInput, true)
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })
  const km = 'intervalKm' in parsed.data ? parsed.data['intervalKm'] : existing.intervalKm
  const months = 'intervalMonths' in parsed.data ? parsed.data['intervalMonths'] : existing.intervalMonths
  if (km == null && months == null) return Response.json({ error: 'Indicá cada cuántos km o cada cuántos meses' }, { status: 400 })

  const rule = await db.orm.public.MaintenanceRule.where({ id }).update(parsed.data)
  return Response.json({ data: rule })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  const { id } = await ctx.params
  await db.orm.public.MaintenanceRule.where({ id }).delete()
  return new Response(null, { status: 204 })
}
