import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { confirmPassword, updateStaff } from '@/src/lib/staff'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const body = await request.json() as { role?: string; active?: boolean; password?: string; name?: string; phone?: string | null; currentPassword?: string }

  // Todo lo que toca a un administrador, y cualquier cambio de rol, se confirma con la contraseña propia
  const target = await db.orm.public.User.first({ id })
  const sensitive = body.role !== undefined || (target?.role === 'admin' && (body.active !== undefined || body.password !== undefined))
  if (sensitive) {
    const denied = await confirmPassword(body.currentPassword)
    if (denied) return Response.json({ error: denied.error }, { status: denied.status })
  }

  const result = await updateStaff({ id: g.session.user.id, name: g.session.user.name }, id, body)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json({ data: { ok: true } })
}
