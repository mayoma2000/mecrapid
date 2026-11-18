import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import type { NextRequest } from 'next/server'
import { customerForEmail, ensureCustomerForSignup } from '@/src/lib/me'

// Vehículos de los que el cliente es dueño actualmente
export async function GET() {
  const g = await requireRole()
  if (!g.ok) return g.response

  const customer = await customerForEmail(g.session.user.email)
  if (!customer) return Response.json({ data: [] })

  const vehicles = await db.orm.public.Vehicle
    .where({ customerId: customer.id })
    .where((v) => v.deletedAt.isNull())
    .include('workOrders', (w) => w.where({ status: 'completed' }).count())
    .orderBy((v) => v.createdAt.asc())
    .all()

  return Response.json({
    data: vehicles.map((v) => ({
      id: v.id, make: v.make, model: v.model, year: v.year, licensePlate: v.licensePlate,
      color: v.color, mileage: v.mileage, servicesCount: v.workOrders,
    })),
  })
}

// El cliente registra su propio vehículo desde la app (al agendar, pedir asistencia o desde el inicio)
export async function POST(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const body = await request.json() as { make?: string; model?: string; year?: number | string; licensePlate?: string; color?: string }
  const make = body.make?.trim()
  const model = body.model?.trim()
  const plate = body.licensePlate?.trim().toUpperCase()
  const year = Number(body.year)
  if (!make || !model || !plate) return Response.json({ error: 'Marca, modelo y placa son obligatorios' }, { status: 400 })
  if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) {
    return Response.json({ error: 'Año inválido' }, { status: 400 })
  }

  // Su ficha de cliente (si es una cuenta vieja sin ficha, se crea con su nombre y correo)
  const customerId = await ensureCustomerForSignup({ name: g.session.user.name, email: g.session.user.email }, null)

  const existing = await db.orm.public.Vehicle.first({ licensePlate: plate })
  if (existing) {
    // Ya era suyo: se devuelve el mismo (no se duplica)
    if (existing.customerId === customerId) {
      // Era suyo y el taller lo había eliminado: lo vuelve a registrar
      if (existing.deletedAt) await db.orm.public.Vehicle.where({ id: existing.id }).update({ deletedAt: null, deletedById: null })
      return Response.json({ data: { ...existing, deletedAt: null, deletedById: null } })
    }
    return Response.json(
      { error: `La placa ${plate} ya está registrada en el taller. Pedile al taller que la pase a tu cuenta.` },
      { status: 409 },
    )
  }

  const vehicle = await db.orm.public.Vehicle.create({
    customerId, make, model, year, licensePlate: plate, color: body.color?.trim() || null, mileage: 0,
  })
  await db.orm.public.VehicleOwnership.create({ vehicleId: vehicle.id, customerId, createdById: g.session.user.id, note: 'Registrado por el cliente desde la app' })
  return Response.json({ data: vehicle }, { status: 201 })
}
