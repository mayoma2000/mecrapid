import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { loadQuote, parseItems, serializeQuote } from '@/src/lib/quotes'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await loadQuote(id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: serializeQuote(quote) })
}

// Editar un borrador: notas, ISV y la lista completa de partidas (se reemplaza)
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await db.orm.public.Quote.first({ id })
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  if (quote.status !== 'draft') {
    return Response.json({ error: 'Solo se puede editar una cotización en borrador' }, { status: 409 })
  }

  const body = await request.json() as { notes?: string | null; taxRate?: number; items?: unknown }
  const updates: Record<string, unknown> = {}
  if (body.notes !== undefined) updates['notes'] = body.notes?.trim() || null
  if (body.taxRate !== undefined) {
    const rate = Number(body.taxRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) return Response.json({ error: 'ISV inválido' }, { status: 400 })
    updates['taxRate'] = rate
  }

  if (body.items !== undefined) {
    const parsed = parseItems(body.items)
    if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 })
    await db.transaction(async (tx) => {
      await tx.orm.public.QuoteItem.where({ quoteId: id }).deleteAll()
      for (const [position, item] of parsed.items.entries()) {
        await tx.orm.public.QuoteItem.create({ ...item, quoteId: id, position })
      }
      if (Object.keys(updates).length > 0) await tx.orm.public.Quote.where({ id }).update(updates)
    })
  } else if (Object.keys(updates).length > 0) {
    await db.orm.public.Quote.where({ id }).update(updates)
  }

  const fresh = await loadQuote(id)
  return Response.json({ data: fresh ? serializeQuote(fresh) : null })
}

// Borrar un borrador
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await db.orm.public.Quote.first({ id })
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  if (quote.status !== 'draft') {
    return Response.json({ error: 'Una cotización enviada no se borra: queda como registro' }, { status: 409 })
  }
  await db.orm.public.Quote.where({ id }).delete()
  return new Response(null, { status: 204 })
}
