import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { loadQuote, serializeQuote } from '@/src/lib/quotes'

type Ctx = { params: Promise<{ id: string }> }

// Enviar al cliente: el borrador queda bloqueado y el cliente lo ve en su app para aprobar
export async function POST(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await loadQuote(id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  if (quote.status !== 'draft') return Response.json({ error: 'La cotización ya fue enviada' }, { status: 409 })
  if (quote.items.length === 0) return Response.json({ error: 'Agregá al menos una partida' }, { status: 400 })

  await db.orm.public.Quote.where({ id }).where({ status: 'draft' }).update({ status: 'sent', sentAt: new Date().toISOString() })
  const fresh = await loadQuote(id)
  return Response.json({ data: fresh ? serializeQuote(fresh) : null })
}
