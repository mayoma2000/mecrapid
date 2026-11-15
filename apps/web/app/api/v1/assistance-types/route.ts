import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, roleOf } from '@/src/lib/authz'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  const query = db.orm.public.AssistanceType.orderBy((t) => t.name.asc())

  // taller → todos (para administrarlos); clientes y público → solo los activos
  const types = session && roleOf(session) !== 'user'
    ? await query.all()
    : await db.orm.public.AssistanceType.where({ active: true }).orderBy((t) => t.name.asc()).all()

  return Response.json({ data: types })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const body = await request.json()
  const { name, description, active } = body

  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const type = await db.orm.public.AssistanceType.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    active: active !== false,
  })

  return Response.json({ data: type }, { status: 201 })
}
