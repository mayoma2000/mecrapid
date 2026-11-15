import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { parseRule, type RuleInput } from '@/src/lib/maintenance'

export async function GET() {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const rules = await db.orm.public.MaintenanceRule.orderBy((r) => r.name.asc()).all()
  return Response.json({ data: rules })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  const parsed = parseRule(await request.json() as RuleInput)
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })
  if (parsed.data['intervalKm'] == null && parsed.data['intervalMonths'] == null) {
    return Response.json({ error: 'Indicá cada cuántos km o cada cuántos meses' }, { status: 400 })
  }
  const rule = await db.orm.public.MaintenanceRule.create(parsed.data as never)
  return Response.json({ data: rule }, { status: 201 })
}
