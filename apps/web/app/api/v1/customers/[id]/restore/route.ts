import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { restoreCustomer } from '@/src/lib/soft-delete'

type Ctx = { params: Promise<{ id: string }> }

// Restaurar un cliente eliminado (vuelve a la lista con todo su historial)
export async function POST(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const result = await restoreCustomer(id)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json({ data: { restored: true } })
}
