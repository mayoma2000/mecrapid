import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { appAccountsByEmail } from '@/src/lib/accounts'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer
    .where({ id })
    .include('vehicles')
    .first()

  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })
  const appAccount = customer.email ? (await appAccountsByEmail([customer.email])).get(customer.email.toLowerCase()) ?? null : null
  return Response.json({ data: { ...customer, appAccount } })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.Customer.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { name, phone, email, address, notes } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates['name'] = String(name).trim()
  if (phone !== undefined) updates['phone'] = String(phone).trim()
  if (email !== undefined) updates['email'] = email ? String(email).trim() : null
  if (address !== undefined) updates['address'] = address ? String(address).trim() : null
  if (notes !== undefined) updates['notes'] = notes ? String(notes).trim() : null

  const customer = await db.orm.public.Customer.where({ id }).update(updates)
  return Response.json({ data: customer })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const existing = await db.orm.public.Customer.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  // Solo se borran clientes sin historial (p. ej. duplicados creados por error):
  // las órdenes, citas, solicitudes y vehículos son registro del taller
  const [orders, appointments, requests, vehicles] = await Promise.all([
    db.orm.public.WorkOrder.where({ customerId: id }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.Appointment.where({ customerId: id }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.AssistanceRequest.where({ customerId: id }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.VehicleOwnership.where({ customerId: id }).aggregate((a) => ({ count: a.count() })),
  ])
  const parts = [
    orders.count && `${orders.count} órdenes`,
    appointments.count && `${appointments.count} citas`,
    requests.count && `${requests.count} solicitudes de asistencia`,
    vehicles.count && `vehículos registrados`,
  ].filter(Boolean)
  if (parts.length > 0) {
    return Response.json(
      { error: `No se puede borrar: tiene ${parts.join(', ')}. Se conserva para no perder el historial.` },
      { status: 409 },
    )
  }

  await db.orm.public.Customer.where({ id }).delete()
  return new Response(null, { status: 204 })
}
