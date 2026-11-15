import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'

export async function GET(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { searchParams } = request.nextUrl
  const customerId = searchParams.get('customerId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const base = customerId
    ? db.orm.public.Vehicle.where({ customerId })
    : db.orm.public.Vehicle

  const [vehicles, agg] = await Promise.all([
    base.include('customer').orderBy((v) => v.createdAt.desc()).limit(limit).offset((page - 1) * limit).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: vehicles, meta: { total: agg.count, page, limit } })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const body = await request.json()
  const { customerId, make, model, year, licensePlate, vin, color, mileage } = body

  if (!customerId || !make || !model || !year || !licensePlate) {
    return Response.json(
      { error: 'customerId, make, model, year and licensePlate are required' },
      { status: 400 },
    )
  }

  const plate = String(licensePlate).trim().toUpperCase()
  if (await db.orm.public.Vehicle.first({ licensePlate: plate })) {
    return Response.json({ error: `Ya hay un vehículo registrado con la placa ${plate}` }, { status: 409 })
  }
  if (!(await db.orm.public.Customer.first({ id: String(customerId) }))) {
    return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }
  const yearNum = Number(year)
  if (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > new Date().getFullYear() + 1) {
    return Response.json({ error: 'Año inválido' }, { status: 400 })
  }

  const vehicle = await db.orm.public.Vehicle.create({
    customerId: String(customerId),
    make: String(make).trim(),
    model: String(model).trim(),
    year: yearNum,
    licensePlate: plate,
    vin: vin ? String(vin).trim().toUpperCase() : null,
    color: color ? String(color).trim() : null,
    mileage: mileage ? Number(mileage) : 0,
  })

  // Primer tramo de dueño: desde que se registró el carro en el taller
  await db.orm.public.VehicleOwnership.create({ vehicleId: vehicle.id, customerId: vehicle.customerId, createdById: g.session.user.id })
  return Response.json({ data: vehicle }, { status: 201 })
}
