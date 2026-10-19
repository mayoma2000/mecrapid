import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'
type Ctx = { params: Promise<{ id: string }> }

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending:       ['assigned', 'cancelled'],
  assigned:      ['in_progress', 'cancelled'],
  in_progress:   ['quality_check', 'cancelled'],
  quality_check: ['completed', 'in_progress'],
  completed:     [],
  cancelled:     [],
}

export async function GET(_request: NextRequest, ctx: Ctx) {

  const { id } = await ctx.params
  const order = await db.orm.public.WorkOrder
    .where({ id })
    .include('customer')
    .include('vehicle')
    .include('serviceItems')
    .include('partItems')
    .first()

  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: order })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {

  const { id } = await ctx.params
  const existing = await db.orm.public.WorkOrder.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { status, mechanicId, diagnosis, estimatedCost, actualCost, notes } = body

  if (status && status !== existing.status) {
    const allowed = STATUS_TRANSITIONS[existing.status as WorkOrderStatus] ?? []
    if (!allowed.includes(status)) {
      return Response.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 422 },
      )
    }
  }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) {
    updates['status'] = status
    if (status === 'completed') updates['completedAt'] = new Date().toISOString()
  }
  if (mechanicId !== undefined) updates['mechanicId'] = mechanicId || null
  if (diagnosis !== undefined) updates['diagnosis'] = diagnosis || null
  if (estimatedCost !== undefined) updates['estimatedCost'] = estimatedCost != null ? Number(estimatedCost) : null
  if (actualCost !== undefined) updates['actualCost'] = actualCost != null ? Number(actualCost) : null
  if (notes !== undefined) updates['notes'] = notes || null

  const order = await db.orm.public.WorkOrder.where({ id }).update(updates)
  return Response.json({ data: order })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {

  const { id } = await ctx.params
  const existing = await db.orm.public.WorkOrder.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!['pending', 'cancelled'].includes(existing.status as string)) {
    return Response.json(
      { error: 'Only pending or cancelled orders can be deleted' },
      { status: 422 },
    )
  }

  await db.orm.public.WorkOrder.where({ id }).delete()
  return new Response(null, { status: 204 })
}
