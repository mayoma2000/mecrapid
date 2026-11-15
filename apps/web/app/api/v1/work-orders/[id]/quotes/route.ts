import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { serializeQuote } from '@/src/lib/quotes'

type Ctx = { params: Promise<{ id: string }> }

// Cotizaciones de una orden (taller)
export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quotes = await db.orm.public.Quote
    .where({ workOrderId: id })
    .include('items')
    .orderBy((q) => q.createdAt.asc())
    .all()

  return Response.json({ data: quotes.map(serializeQuote) })
}

// Nueva cotización en borrador
export async function POST(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const order = await db.orm.public.WorkOrder.first({ id })
  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
  if (order.status === 'completed' || order.status === 'cancelled') {
    return Response.json({ error: 'La orden está cerrada' }, { status: 422 })
  }
  const draft = await db.orm.public.Quote.where({ workOrderId: id }).where({ status: 'draft' }).first()
  if (draft) return Response.json({ error: 'Ya hay una cotización en borrador para esta orden', data: { id: draft.id } }, { status: 409 })

  const quote = await db.orm.public.Quote.create({ workOrderId: id, createdById: g.session.user.id })
  return Response.json({ data: serializeQuote({ ...quote, items: [] }) }, { status: 201 })
}
