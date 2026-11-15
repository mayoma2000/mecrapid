import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'

export async function GET() {
  const types = await db.orm.public.ServiceType
    .where({ active: true })
    .orderBy((t) => t.name.asc())
    .all()

  return Response.json({ data: types })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const body = await request.json()
  const { name, description, durationMinutes, price } = body

  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const type = await db.orm.public.ServiceType.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    durationMinutes: durationMinutes != null ? Number(durationMinutes) : 60,
    price: price != null && price !== '' ? Number(price) : null,
  })

  return Response.json({ data: type }, { status: 201 })
}
