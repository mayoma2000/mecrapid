import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { recordMechanicChange } from '@/src/lib/staff'

type Ctx = { params: Promise<{ id: string }> }

// Editar datos, activar/desactivar o cambiar la contraseña de un mecánico (solo admin)
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const mechanic = await db.orm.public.User.first({ id })
  if (!mechanic || mechanic.role !== 'mecanico') return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { name?: string; phone?: string | null; active?: boolean; password?: string }
  const h = await headers()
  const actor = { id: g.session.user.id, name: g.session.user.name }

  const updates: Record<string, unknown> = {}
  if (body.name?.trim()) updates['name'] = body.name.trim()
  if (body.phone !== undefined) updates['phone'] = body.phone?.trim() || null
  if (Object.keys(updates).length > 0) await db.orm.public.User.where({ id }).update(updates)

  if (body.password !== undefined) {
    if (body.password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    await auth.api.setUserPassword({ headers: h, body: { userId: id, newPassword: body.password } })
    await auth.api.revokeUserSessions({ headers: h, body: { userId: id } })
    await recordMechanicChange(actor, id, 'password_reset', `cambió la contraseña de ${mechanic.name}`)
  }

  // Desactivar = ban de better-auth: no puede iniciar sesión y se cierran sus sesiones
  if (body.active === false && !mechanic.banned) {
    await auth.api.banUser({ headers: h, body: { userId: id, banReason: 'Desactivado por el administrador' } })
    await recordMechanicChange(actor, id, 'deactivated', `desactivó la cuenta de ${mechanic.name}`)
  } else if (body.active === true && mechanic.banned) {
    await auth.api.unbanUser({ headers: h, body: { userId: id } })
    await recordMechanicChange(actor, id, 'reactivated', `reactivó la cuenta de ${mechanic.name}`)
  }

  const updated = await db.orm.public.User.first({ id })
  return Response.json({
    data: { id, name: updated?.name, email: updated?.email, phone: updated?.phone, active: !updated?.banned },
  })
}
