import { auth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const customerId = searchParams.get('customerId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const vehicles = customerId
    ? await db.orm.public.Vehicle
        .where({ customerId })
        .include({ customer: true })
        .orderBy({ createdAt: 'desc' })
        .skip((page - 1) * limit)
        .take(limit)
        .all()
    : await db.orm.public.Vehicle
        .include({ customer: true })
        .orderBy({ createdAt: 'desc' })
        .skip((page - 1) * limit)
        .take(limit)
        .all()

  const total = customerId
    ? await db.orm.public.Vehicle.where({ customerId }).count()
    : await db.orm.public.Vehicle.count()

  return Response.json({ data: vehicles, meta: { total, page, limit } })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { customerId, make, model, year, licensePlate, vin, color, mileage } = body

  if (!customerId || !make || !model || !year || !licensePlate) {
    return Response.json(
      { error: 'customerId, make, model, year and licensePlate are required' },
      { status: 400 }
    )
  }

  const vehicle = await db.orm.public.Vehicle.create({
    customerId: String(customerId),
    make: String(make).trim(),
    model: String(model).trim(),
    year: Number(year),
    licensePlate: String(licensePlate).trim().toUpperCase(),
    vin: vin ? String(vin).trim().toUpperCase() : null,
    color: color ? String(color).trim() : null,
    mileage: mileage ? Number(mileage) : 0,
  })

  return Response.json({ data: vehicle }, { status: 201 })
}
