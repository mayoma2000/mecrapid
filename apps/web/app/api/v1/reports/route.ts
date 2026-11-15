import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { buildReport } from '@/src/lib/reports'

// Reportes del taller (solo admin: incluye ingresos). ?months=3|6|12
export async function GET(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const months = Number(request.nextUrl.searchParams.get('months') ?? '6')
  if (![1, 3, 6, 12].includes(months)) return Response.json({ error: 'months debe ser 1, 3, 6 o 12' }, { status: 400 })

  return Response.json({ data: await buildReport(months) })
}
