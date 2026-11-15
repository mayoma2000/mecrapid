import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'

// Mecánicos = usuarios de better-auth con role 'mecanico'
export async function GET(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const includeInactive = request.nextUrl.searchParams.get('all') === '1'
  const mechanics = await db.orm.public.User
    .where((u) => u.role.eq('mecanico'))
    .orderBy((u) => u.name.asc())
    .all()

  const data = mechanics
    .filter((m) => includeInactive || !m.banned)
    .map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, active: !m.banned, createdAt: m.createdAt }))

  return Response.json({ data, meta: { total: data.length } })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const body = await request.json() as { name?: string; email?: string; phone?: string; password?: string }
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''

  if (!name || !email) return Response.json({ error: 'Nombre y correo son obligatorios' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })

  try {
    const { user } = await auth.api.createUser({
      headers: await headers(),
      body: { name, email, password, data: { phone: body.phone?.trim() || null } },
    })
    // El plugin admin solo tipa 'user' | 'admin'; el rol 'mecanico' vive en la misma columna
    await db.orm.public.User.where({ id: user.id }).update({ role: 'mecanico' })
    return Response.json({ data: { id: user.id, name: user.name, email: user.email, active: true } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el mecánico'
    const status = /exist/i.test(message) ? 409 : 400
    return Response.json({ error: status === 409 ? 'Ya existe una cuenta con ese correo' : message }, { status })
  }
}
