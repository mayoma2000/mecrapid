import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const req = await db.orm.public.AssistanceRequest
    .where({ id })
    .include('customer')
    .include('assistanceType')
    .include('workOrder')
    .first()

  if (!req) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: req })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.orm.public.AssistanceRequest
    .where({ id })
    .include('customer')
    .first()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { action, status } = body

  // Activate: create WorkOrder and link it
  if (action === 'activate') {
    if (existing.workOrderId) {
      return Response.json({ error: 'Already activated' }, { status: 409 })
    }

    const customerId = existing.customerId
    if (!customerId) {
      return Response.json({ error: 'No customer linked to this request' }, { status: 422 })
    }

    const workOrder = await db.orm.public.WorkOrder.create({
      customerId,
      vehicleId: null,
      complaint: existing.detail,
      notes: `Solicitud de asistencia #${id.slice(0, 8).toUpperCase()}`,
    })

    const updated = await db.orm.public.AssistanceRequest
      .where({ id })
      .update({ status: 'active', workOrderId: workOrder.id })

    return Response.json({ data: updated })
  }

  // Generic status update
  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates['status'] = status

  const updated = await db.orm.public.AssistanceRequest.where({ id }).update(updates)
  return Response.json({ data: updated })
}
