import type { NextRequest } from 'next/server'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { loadQuote, respondToQuote, serializeQuote, type Decision } from '@/src/lib/quotes'

type Ctx = { params: Promise<{ id: string }> }

// El taller registra la respuesta que el cliente dio fuera de la app (por teléfono, en persona).
// La nota es obligatoria: queda como constancia de quién autorizó y cómo.
export async function POST(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const body = await request.json() as { decisions?: { itemId: string; decision: Decision }[]; note?: string }
  if (!body.note?.trim()) {
    return Response.json({ error: 'Indicá cómo respondió el cliente (ej. "Aprobó por teléfono a las 10:30")' }, { status: 400 })
  }

  const result = await respondToQuote(id, body.decisions ?? [], { userId: g.session.user.id, via: 'staff', note: body.note })
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  const fresh = await loadQuote(id)
  return Response.json({ data: fresh ? serializeQuote(fresh) : null })
}
