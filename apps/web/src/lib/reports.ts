import { db } from '@/src/prisma/db'
import { toDate } from '@/src/lib/job-time'

// Honduras está en UTC-6 todo el año: los meses se cuentan en hora local
const HN_OFFSET_MS = 6 * 60 * 60 * 1000
const round2 = (n: number) => Math.round(n * 100) / 100

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function hnMonthKey(ms: number): string {
  const d = new Date(ms - HN_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Inicio (UTC) del mes de Honduras que está `back` meses antes del actual
function hnMonthStart(now: number, back: number): number {
  const d = new Date(now - HN_OFFSET_MS)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1) + HN_OFFSET_MS
}

// "Cambio de aceite (x2)" y "cambio de aceite " cuentan como el mismo servicio
const serviceKey = (s: string) => s.replace(/\s*\(x[\d.,]+\)\s*$/i, '').trim().toLowerCase()

type OrderRow = {
  id: string; status: string; completedAt: string | null; createdAt: string
  estimatedCost: number | null; actualCost: number | null; mechanicId: string | null; vehicleId: string | null; customerId: string
  serviceItems: { description: string; cost: number }[]
  partItems: { name: string; quantity: number; totalPrice: number }[]
}

// Lo que se le cobra (o cobrará) al cliente por una orden completada
function orderRevenue(o: OrderRow): number {
  if (o.actualCost != null) return o.actualCost
  if (o.estimatedCost != null) return o.estimatedCost
  return o.serviceItems.reduce((s, i) => s + i.cost, 0) + o.partItems.reduce((s, i) => s + i.totalPrice, 0)
}

function summarize(orders: OrderRow[]) {
  const revenue = round2(orders.reduce((s, o) => s + orderRevenue(o), 0))
  return {
    revenue,
    orders: orders.length,
    avgTicket: orders.length ? round2(revenue / orders.length) : 0,
    vehicles: new Set(orders.map((o) => o.vehicleId ?? `sin-vehiculo-${o.id}`)).size,
    customers: new Set(orders.map((o) => o.customerId)).size,
  }
}

const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)

// Reporte del taller para los últimos `months` meses (incluye el mes en curso)
export async function buildReport(months: number, now = Date.now()) {
  const from = hnMonthStart(now, months - 1)
  const prevFrom = hnMonthStart(now, months * 2 - 1)

  const [all, mechanics, logs, quoteItems] = await Promise.all([
    db.orm.public.WorkOrder
      .where({ status: 'completed' })
      .include('serviceItems')
      .include('partItems')
      .all(),
    db.orm.public.User.where((u) => u.role.eq('mecanico')).all(),
    db.orm.public.WorkOrderTimeLog.where((l) => l.startedAt.gte(new Date(from).toISOString())).all(),
    db.orm.public.QuoteItem.where((i) => i.decidedAt.gte(new Date(from).toISOString())).all(),
  ])

  const at = (o: OrderRow) => toDate(o.completedAt ?? o.createdAt).getTime()
  const current = all.filter((o) => at(o) >= from && at(o) <= now)
  const previous = all.filter((o) => at(o) >= prevFrom && at(o) < from)
  const cur = summarize(current)
  const prev = summarize(previous)

  // Ingreso y órdenes por mes (todos los meses del rango, aunque estén en cero)
  const monthly = Array.from({ length: months }, (_, i) => {
    const start = hnMonthStart(now, months - 1 - i)
    const key = hnMonthKey(start)
    const inMonth = current.filter((o) => hnMonthKey(at(o)) === key)
    const [y, m] = key.split('-').map(Number)
    return { month: key, label: `${MONTHS[m! - 1]} ${String(y).slice(2)}`, ...summarize(inMonth) }
  })

  // Productividad por mecánico: órdenes terminadas y horas cronometradas en el rango
  const byMechanic = mechanics.map((m) => {
    const done = current.filter((o) => o.mechanicId === m.id)
    const seconds = logs
      .filter((l) => l.mechanicId === m.id)
      .reduce((s, l) => s + Math.max(0, ((l.endedAt ? toDate(l.endedAt).getTime() : now) - toDate(l.startedAt).getTime()) / 1000), 0)
    const hours = round2(seconds / 3600)
    return {
      id: m.id,
      name: m.name,
      active: !m.banned,
      orders: done.length,
      revenue: round2(done.reduce((s, o) => s + orderRevenue(o), 0)),
      hours,
      hoursPerOrder: done.length ? round2(hours / done.length) : null,
    }
  }).sort((a, b) => b.orders - a.orders || b.hours - a.hours)

  // Servicios y repuestos más vendidos (por veces y por monto, sin ISV)
  const services = new Map<string, { name: string; count: number; amount: number }>()
  for (const o of current) {
    for (const s of o.serviceItems) {
      const k = serviceKey(s.description)
      const row = services.get(k) ?? { name: s.description.replace(/\s*\(x[\d.,]+\)\s*$/i, '').trim(), count: 0, amount: 0 }
      row.count++; row.amount = round2(row.amount + s.cost)
      services.set(k, row)
    }
  }
  const parts = new Map<string, { name: string; count: number; amount: number }>()
  for (const o of current) {
    for (const p of o.partItems) {
      const k = p.name.trim().toLowerCase()
      const row = parts.get(k) ?? { name: p.name.trim(), count: 0, amount: 0 }
      row.count += p.quantity; row.amount = round2(row.amount + p.totalPrice)
      parts.set(k, row)
    }
  }
  const top = (m: Map<string, { name: string; count: number; amount: number }>) =>
    [...m.values()].sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 8)

  // Tasa de aprobación de cotizaciones: partidas aprobadas de las que el cliente decidió
  const decided = quoteItems.filter((i) => i.decision === 'approved' || i.decision === 'rejected')
  const approved = decided.filter((i) => i.decision === 'approved').length

  return {
    range: { months, from: new Date(from).toISOString(), to: new Date(now).toISOString() },
    kpis: {
      ...cur,
      quoteApprovalRate: decided.length ? Math.round((approved / decided.length) * 100) : null,
      change: {
        revenue: pct(cur.revenue, prev.revenue),
        orders: pct(cur.orders, prev.orders),
        avgTicket: pct(cur.avgTicket, prev.avgTicket),
        vehicles: pct(cur.vehicles, prev.vehicles),
      },
    },
    monthly,
    mechanics: byMechanic,
    topServices: top(services),
    topParts: top(parts),
  }
}
