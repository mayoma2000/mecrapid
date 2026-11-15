import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { findOwnQuote } from '@/src/lib/me'
import { serializeQuote } from '@/src/lib/quotes'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const quote = await findOwnQuote(g.session.user.email, id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })

  const { workOrder, ...rest } = quote
  return Response.json({
    data: {
      ...serializeQuote(rest),
      workOrder: { id: workOrder.id, complaint: workOrder.complaint, status: workOrder.status },
      vehicle: workOrder.vehicle
        ? { make: workOrder.vehicle.make, model: workOrder.vehicle.model, year: workOrder.vehicle.year, licensePlate: workOrder.vehicle.licensePlate }
        : null,
    },
  })
}
