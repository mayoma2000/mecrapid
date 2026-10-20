import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  let base = db.orm.public.AssistanceRequest as typeof db.orm.public.AssistanceRequest
  if (status) base = base.where({ status }) as typeof base

  const [requests, agg] = await Promise.all([
    base
      .include('customer')
      .include('assistanceType')
      .orderBy((r) => r.createdAt.desc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all(),
    base.aggregate((a) => ({ count: a.count() })),
  ])

  return Response.json({ data: requests, meta: { total: agg.count, page, limit } })
}
