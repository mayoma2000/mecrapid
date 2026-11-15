import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { customerForEmail } from '@/src/lib/me'
import { getVehicleHistory } from '@/src/lib/vehicle-history'

type Ctx = { params: Promise<{ id: string }> }

// Historial para el dueño actual: lo suyo completo; de dueños anteriores, solo
// qué se le hizo al carro (sin nombre ni precios)
export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const customer = await customerForEmail(g.session.user.email)
  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })

  const { id } = await ctx.params
  const history = await getVehicleHistory(id, { kind: 'customer', customerId: customer.id })
  if (!history) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: history })
}
