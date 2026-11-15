import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'

// Marcar como leídos: { ids: [...] } o { all: true }
export async function POST(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const body = await request.json().catch(() => ({})) as { ids?: string[]; all?: boolean }
  const now = new Date().toISOString()
  const mine = db.orm.public.Notification.where({ userId: g.session.user.id }).where((n) => n.readAt.isNull())

  if (body.all) await mine.updateAll({ readAt: now })
  else if (body.ids?.length) await mine.where((n) => n.id.in(body.ids!)).updateAll({ readAt: now })

  return Response.json({ data: { ok: true } })
}
