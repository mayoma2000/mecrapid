import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'

// La app registra el token de Expo de este teléfono al iniciar sesión.
// Si el token ya era de otra cuenta (se cambió de usuario en el mismo teléfono), pasa a esta.
export async function POST(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const { token, platform } = await request.json() as { token?: string; platform?: string }
  if (!token || !/^Expo(nent)?PushToken\[.+\]$/.test(token)) {
    return Response.json({ error: 'Token de Expo inválido' }, { status: 400 })
  }

  const userId = g.session.user.id
  const existing = await db.orm.public.PushToken.first({ token })
  if (existing) {
    if (existing.userId !== userId || existing.platform !== (platform ?? null)) {
      await db.orm.public.PushToken.where({ token }).update({ userId, platform: platform ?? null })
    }
  } else {
    await db.orm.public.PushToken.create({ userId, token, platform: platform ?? null })
  }
  return Response.json({ data: { ok: true } })
}

// Al cerrar sesión: este teléfono deja de recibir avisos de la cuenta
export async function DELETE(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const { token } = await request.json().catch(() => ({})) as { token?: string }
  if (token) {
    await db.orm.public.PushToken.where({ token }).where({ userId: g.session.user.id }).deleteAll()
  }
  return new Response(null, { status: 204 })
}
