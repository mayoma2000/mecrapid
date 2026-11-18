import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { setVehicleDeleted } from '@/src/lib/soft-delete'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const vehicle = await db.orm.public.Vehicle
    .where({ id })
    .include('customer')
    .first()
  if (!vehicle) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ data: vehicle })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response
  const { id } = await ctx.params
  const existing = await db.orm.public.Vehicle.first({ id })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { make, model, year, licensePlate, vin, color, mileage } = body

  const updates: Record<string, unknown> = {}
  if (make !== undefined) updates['make'] = String(make).trim()
  if (model !== undefined) updates['model'] = String(model).trim()
  if (year !== undefined) updates['year'] = Number(year)
  if (licensePlate !== undefined) {
    const plate = String(licensePlate).trim().toUpperCase()
    const other = await db.orm.public.Vehicle.first({ licensePlate: plate })
    if (other && other.id !== id) {
      return Response.json({ error: `Ya hay otro vehículo con la placa ${plate}` }, { status: 409 })
    }
    updates['licensePlate'] = plate
  }
  if (vin !== undefined) updates['vin'] = vin ? String(vin).trim().toUpperCase() : null
  if (color !== undefined) updates['color'] = color ? String(color).trim() : null
  if (mileage !== undefined) updates['mileage'] = mileage != null ? Number(mileage) : 0

  const vehicle = await db.orm.public.Vehicle.where({ id }).update(updates)
  return Response.json({ data: vehicle })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  // No se borra: queda como eliminado con su historial y se puede restaurar
  const { id } = await ctx.params
  const result = await setVehicleDeleted(id, g.session.user.id)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json({ data: { deleted: true } })
}
