import { db } from '@/src/prisma/db'

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'partially_approved' | 'rejected'
export type ItemKind = 'service' | 'part'
export type ItemPriority = 'urgent' | 'recommended' | 'optional'
export type Decision = 'approved' | 'rejected'

export const KINDS: ItemKind[] = ['service', 'part']
export const PRIORITIES: ItemPriority[] = ['urgent', 'recommended', 'optional']

type ItemLike = { quantity: number; unitPrice: number; decision: string; position: number }

const round2 = (n: number) => Math.round(n * 100) / 100

export function quoteTotals(items: ItemLike[], taxRate: number) {
  const line = (i: ItemLike) => i.quantity * i.unitPrice
  const subtotal = round2(items.reduce((s, i) => s + line(i), 0))
  const approvedSubtotal = round2(items.filter((i) => i.decision === 'approved').reduce((s, i) => s + line(i), 0))
  return {
    subtotal,
    tax: round2(subtotal * taxRate),
    total: round2(subtotal * (1 + taxRate)),
    approvedSubtotal,
    approvedTotal: round2(approvedSubtotal * (1 + taxRate)),
  }
}

// Cotización lista para la API: partidas ordenadas + totales calculados
export function serializeQuote<Q extends { taxRate: number; items: I[] }, I extends ItemLike>(quote: Q) {
  const items = [...quote.items].sort((a, b) => a.position - b.position)
  return { ...quote, items, ...quoteTotals(items, quote.taxRate) }
}

export function loadQuote(id: string) {
  return db.orm.public.Quote
    .where({ id })
    .include('items')
    .include('workOrder', (w) => w.include('customer').include('vehicle'))
    .first()
}

// Valida y normaliza las partidas que manda el editor (borrador)
export type ItemInput = {
  kind?: string; description?: string; quantity?: number | string; unitPrice?: number | string
  priority?: string; sparePartId?: string | null
}

export type ParsedItem = {
  kind: ItemKind; description: string; quantity: number; unitPrice: number
  priority: ItemPriority; sparePartId: string | null
}

export function parseItems(raw: unknown): { items: ParsedItem[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: 'items debe ser una lista' }
  const items: ParsedItem[] = []
  for (const [i, it] of (raw as ItemInput[]).entries()) {
    const description = String(it.description ?? '').trim()
    const quantity = Number(it.quantity ?? 1)
    const unitPrice = Number(it.unitPrice ?? 0)
    const kind = KINDS.includes(it.kind as ItemKind) ? (it.kind as ItemKind) : 'service'
    const priority = PRIORITIES.includes(it.priority as ItemPriority) ? (it.priority as ItemPriority) : 'recommended'
    if (!description) return { error: `La partida ${i + 1} no tiene descripción` }
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: `Cantidad inválida en la partida ${i + 1}` }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: `Precio inválido en la partida ${i + 1}` }
    items.push({ kind, description, quantity, unitPrice: round2(unitPrice), priority, sparePartId: it.sparePartId || null })
  }
  return { items }
}

type Actor = { userId: string; via: 'app' | 'staff'; note?: string | null }

// Registra la respuesta del cliente a una cotización enviada: decide cada partida,
// fija el estado de la cotización y copia lo aprobado a la orden como trabajo autorizado.
// Todo en una transacción con la cotización bloqueada, para que no se responda dos veces.
export async function respondToQuote(
  quoteId: string,
  decisions: { itemId: string; decision: Decision }[],
  actor: Actor,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  return db.transaction(async (tx) => {
    const quote = await tx.orm.public.Quote.where({ id: quoteId }).forUpdate().first()
    if (!quote) return { ok: false as const, status: 404, error: 'Not found' }
    if (quote.status !== 'sent') {
      return { ok: false as const, status: 409, error: 'Esta cotización ya fue respondida o no ha sido enviada' }
    }

    const items = await tx.orm.public.QuoteItem.where({ quoteId }).all()
    const byId = new Map(decisions.map((d) => [d.itemId, d.decision]))
    if (items.some((i) => byId.get(i.id) !== 'approved' && byId.get(i.id) !== 'rejected')) {
      return { ok: false as const, status: 400, error: 'Falta aprobar o rechazar alguna partida' }
    }

    const now = new Date().toISOString()
    for (const item of items) {
      await tx.orm.public.QuoteItem.where({ id: item.id }).update({ decision: byId.get(item.id)!, decidedAt: now })
    }

    const approved = items.filter((i) => byId.get(i.id) === 'approved')
    const status: QuoteStatus =
      approved.length === items.length ? 'approved' : approved.length === 0 ? 'rejected' : 'partially_approved'

    await tx.orm.public.Quote.where({ id: quoteId }).update({
      status,
      respondedAt: now,
      respondedById: actor.userId,
      respondedVia: actor.via,
      responseNote: actor.note?.trim() || null,
    })

    // Trabajo autorizado en la orden (servicios y repuestos), con referencia a la partida
    for (const item of approved) {
      const total = round2(item.quantity * item.unitPrice)
      if (item.kind === 'part') {
        await tx.orm.public.PartLineItem.create({
          workOrderId: quote.workOrderId,
          sparePartId: item.sparePartId,
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          quoteItemId: item.id,
        })
      } else {
        await tx.orm.public.ServiceLineItem.create({
          workOrderId: quote.workOrderId,
          description: item.quantity === 1 ? item.description : `${item.description} (x${item.quantity})`,
          cost: total,
          quoteItemId: item.id,
        })
      }
    }

    // El costo estimado de la orden = todo lo aprobado en sus cotizaciones (con ISV)
    const answered = await tx.orm.public.Quote.where({ workOrderId: quote.workOrderId }).include('items').all()
    const estimated = round2(
      answered.reduce((sum, q) => sum + quoteTotals(q.items, q.taxRate).approvedTotal, 0),
    )
    await tx.orm.public.WorkOrder.where({ id: quote.workOrderId }).update({ estimatedCost: estimated })

    return { ok: true as const }
  })
}
