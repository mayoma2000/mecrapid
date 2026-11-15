import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { serializeQuote } from '@/src/lib/quotes'
import { parsePaging } from '@/src/lib/paging'
import { toDate } from '@/src/lib/job-time'

const STATUSES = ['draft', 'sent', 'approved', 'partially_approved', 'rejected'] as const
const DAY_MS = 24 * 60 * 60 * 1000

// Todas las cotizaciones del taller para darles seguimiento.
// ?status=draft|sent|approved|partially_approved|rejected · ?limit=&offset=
// meta.counts trae cuántas hay por estado (para las pestañas)
export async function GET(request: NextRequest) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const quotes = await db.orm.public.Quote
    .include('items')
    .include('workOrder', (w) => w.include('customer').include('vehicle'))
    .all()

  const now = Date.now()
  const rows = quotes.map((q) => {
    const s = serializeQuote(q)
    const since = q.status === 'sent' ? q.sentAt : q.status === 'draft' ? q.createdAt : null
    return {
      id: q.id,
      status: q.status,
      workOrderId: q.workOrderId,
      createdAt: q.createdAt,
      sentAt: q.sentAt,
      respondedAt: q.respondedAt,
      respondedVia: q.respondedVia,
      itemsCount: s.items.length,
      total: s.total,
      approvedTotal: s.approvedTotal,
      // Días esperando al cliente (enviadas) o sin enviar (borradores)
      waitingDays: since ? Math.floor((now - toDate(since).getTime()) / DAY_MS) : null,
      customer: q.workOrder?.customer ? { id: q.workOrder.customer.id, name: q.workOrder.customer.name, phone: q.workOrder.customer.phone } : null,
      vehicle: q.workOrder?.vehicle ? { make: q.workOrder.vehicle.make, model: q.workOrder.vehicle.model, licensePlate: q.workOrder.vehicle.licensePlate } : null,
    }
  })

  // Las que esperan respuesta: las más viejas primero (las que hay que perseguir).
  // El resto: lo más reciente primero.
  const sortKey = (r: (typeof rows)[number]) => r.respondedAt ?? r.sentAt ?? r.createdAt
  const status = request.nextUrl.searchParams.get('status')
  const filtered = rows
    .filter((r) => !status || r.status === status)
    .sort((a, b) => status === 'sent'
      ? (a.sentAt ?? '').localeCompare(b.sentAt ?? '')
      : sortKey(b).localeCompare(sortKey(a)))

  const counts = Object.fromEntries(STATUSES.map((st) => [st, rows.filter((r) => r.status === st).length]))
  const { limit, offset } = parsePaging(request, 100)
  const page = limit == null ? filtered : filtered.slice(offset, offset + limit)

  return Response.json({ data: page, meta: { total: filtered.length, offset, counts } })
}
