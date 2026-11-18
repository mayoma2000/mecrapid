import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { recordClientAccountChange } from '@/src/lib/staff'

type Ctx = { params: Promise<{ id: string }> }

// Cuenta de la app del cliente (la que creó con "Crear cuenta"): desactivar, reactivar
// o cambiar la contraseña. Solo admin. Queda en el registro de cambios del personal.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const customer = await db.orm.public.Customer.first({ id })
  if (!customer?.email) return Response.json({ error: 'Este cliente no tiene correo, así que no tiene cuenta en la app' }, { status: 404 })

  const user = await db.orm.public.User.where((u) => u.email.eq(customer.email!.toLowerCase())).first()
  if (!user) return Response.json({ error: 'Este cliente todavía no creó su cuenta en la app' }, { status: 404 })
  // Si el correo es de alguien del personal, se gestiona en "Usuarios del taller"
  if (user.role === 'admin' || user.role === 'mecanico') {
    return Response.json({ error: 'Esa cuenta es del personal del taller: gestionala en Usuarios del taller' }, { status: 409 })
  }

  const body = await request.json() as { active?: boolean; password?: string }
  const h = await headers()
  const actor = { id: g.session.user.id, name: g.session.user.name }

  if (body.password !== undefined) {
    if (body.password.length < 8) return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    await auth.api.setUserPassword({ headers: h, body: { userId: user.id, newPassword: body.password } })
    await auth.api.revokeUserSessions({ headers: h, body: { userId: user.id } })
    await recordClientAccountChange(actor, user.id, 'password_reset', `cambió la contraseña de la cuenta de cliente de ${customer.name}`)
  }
  if (body.active === false && !user.banned) {
    await auth.api.banUser({ headers: h, body: { userId: user.id, banReason: `Desactivado por ${actor.name}` } })
    await recordClientAccountChange(actor, user.id, 'deactivated', `desactivó la cuenta de cliente de ${customer.name}`)
  } else if (body.active === true && user.banned) {
    await auth.api.unbanUser({ headers: h, body: { userId: user.id } })
    await recordClientAccountChange(actor, user.id, 'reactivated', `reactivó la cuenta de cliente de ${customer.name}`)
  }

  return Response.json({ data: { ok: true } })
}
