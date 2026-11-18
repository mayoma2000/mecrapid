import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'
import { requireRole, roleOf } from '@/src/lib/authz'
import { customerForEmail } from '@/src/lib/me'

// "Mi perfil": nombre y teléfono de la cuenta (el correo es el usuario y no se cambia aquí).
// Para un cliente también se actualiza su ficha del taller, para que todos vean lo mismo.
export async function PATCH(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const body = await request.json() as { name?: string; phone?: string }
  const name = body.name?.trim()
  const digits = (body.phone ?? '').replace(/\D/g, '')
  if (!name || name.length < 3) return Response.json({ error: 'Escribí tu nombre completo' }, { status: 400 })
  if (body.phone !== undefined && digits.length !== 8) return Response.json({ error: 'El teléfono debe tener 8 dígitos' }, { status: 400 })
  const phone = body.phone !== undefined ? `${digits.slice(0, 4)}-${digits.slice(4)}` : undefined

  await auth.api.updateUser({
    headers: await headers(),
    body: { name, ...(phone !== undefined ? { phone } : {}) } as { name: string },
  })

  if (roleOf(g.session) === 'user') {
    const customer = await customerForEmail(g.session.user.email)
    if (customer) {
      await db.orm.public.Customer.where({ id: customer.id }).update({ name, ...(phone !== undefined ? { phone } : {}) })
    }
  }

  return Response.json({ data: { name, phone: phone ?? null } })
}
