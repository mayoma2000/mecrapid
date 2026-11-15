import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { customerForEmail } from '@/src/lib/me'
import { parsePaging } from '@/src/lib/paging'

// Órdenes del cliente, más recientes primero. ?limit=&offset= para paginar
export async function GET(request: NextRequest) {
  const g = await requireRole()
  if (!g.ok) return g.response

  const customer = await customerForEmail(g.session.user.email)
  if (!customer) return Response.json({ data: [], meta: { total: 0 } })

  const { limit, offset } = parsePaging(request)
  const base = db.orm.public.WorkOrder.where({ customerId: customer.id })
  const [orders, agg] = await Promise.all([
    limit == null
      ? base.include('vehicle').orderBy((o) => o.createdAt.desc()).all()
      : base.include('vehicle').orderBy((o) => o.createdAt.desc()).limit(limit).offset(offset).all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: orders, meta: { total: agg.count, offset } })
}
