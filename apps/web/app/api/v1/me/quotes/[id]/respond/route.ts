import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { respondToQuote, type Decision } from '@/src/lib/quotes'
import { findOwnQuote } from '@/src/lib/me'
import { loadQuote, serializeQuote } from '@/src/lib/quotes'
import { notifyLater, staffForOrder } from '@/src/lib/notify'
import { money } from '@/src/lib/quote-labels'

type Ctx = { params: Promise<{ id: string }> }

// El cliente aprueba o rechaza cada partida desde la app y envía todo junto
export async function POST(request: NextRequest, ctx: Ctx) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await findOwnQuote(g.session.user.email, id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { decisions?: { itemId: string; decision: Decision }[]; note?: string }
  const result = await respondToQuote(id, body.decisions ?? [], { userId: g.session.user.id, via: 'app', note: body.note })
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  const answered = await loadQuote(id)
  if (answered) {
    const q = serializeQuote(answered)
    const approved = q.items.filter((i) => i.decision === 'approved').length
    notifyLater(() => staffForOrder(quote.workOrderId), {
      type: 'quote_answered',
      title: approved === 0 ? '❌ Cotización rechazada' : approved === q.items.length ? '✅ Cotización aprobada' : '☑️ Cotización aprobada en parte',
      body: `${g.session.user.name} aprobó ${approved} de ${q.items.length} partidas · ${money(q.approvedTotal)}`,
      url: `/(tabs)/orders/quotes/${id}`,
    })
  }
  return Response.json({ data: { ok: true } })
}
