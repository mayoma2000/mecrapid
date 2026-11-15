import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'

// Bandeja de avisos del usuario (cliente o taller): los 50 más recientes + cuántos sin leer
export async function GET() {
  const g = await requireRole()
  if (!g.ok) return g.response

  const userId = g.session.user.id
  const [items, unread] = await Promise.all([
    db.orm.public.Notification
      .where({ userId })
      .orderBy((n) => n.createdAt.desc())
      .limit(50)
      .all(),
    db.orm.public.Notification
      .where({ userId })
      .where((n) => n.readAt.isNull())
      .aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: items, meta: { unread: unread.count } })
}
