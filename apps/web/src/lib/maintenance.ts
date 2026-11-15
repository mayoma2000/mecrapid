import { db } from '@/src/prisma/db'
import { toDate } from '@/src/lib/job-time'

// Si no hay suficiente historial para calcular cuánto se maneja el carro,
// se asume un uso típico de ~1,000 km al mes
const DEFAULT_KM_PER_DAY = 33
const DAY_MS = 24 * 60 * 60 * 1000

export type MaintenanceStatus = 'ok' | 'soon' | 'due' | 'unknown'

export type MaintenanceItem = {
  ruleId: string
  name: string
  intervalKm: number | null
  intervalMonths: number | null
  status: MaintenanceStatus
  lastDoneAt: string | null
  lastDoneKm: number | null
  lastOrderId: string | null
  nextDueKm: number | null
  nextDueAt: string | null
  kmRemaining: number | null
  daysRemaining: number | null
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function addMonths(d: Date, months: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + months)
  return r
}

export async function activeRules() {
  return db.orm.public.MaintenanceRule.where({ active: true }).orderBy((r) => r.name.asc()).all()
}

type VehicleWithOrders = {
  id: string
  mileage: number
  updatedAt: string
  workOrders: {
    id: string; status: string; mileageIn: number | null; completedAt: string | null; createdAt: string
    serviceItems: { description: string }[]; partItems: { name: string }[]
  }[]
}

export function loadVehicleForMaintenance(vehicleId: string) {
  return db.orm.public.Vehicle
    .where({ id: vehicleId })
    .include('workOrders', (w) => w.where({ status: 'completed' }).include('serviceItems').include('partItems'))
    .first()
}

// Estado de cada mantenimiento del vehículo: "lo que primero llegue", km o meses
export function computeMaintenance(
  vehicle: VehicleWithOrders,
  rules: { id: string; name: string; keywords: string; intervalKm: number | null; intervalMonths: number | null }[],
  now = Date.now(),
) {
  const done = vehicle.workOrders
    .filter((o) => o.status === 'completed')
    .map((o) => ({ ...o, at: toDate(o.completedAt ?? o.createdAt).getTime() }))
    .sort((a, b) => b.at - a.at)

  // Puntos de kilometraje conocidos (órdenes + el último km registrado en el vehículo)
  const points = [
    ...done.filter((o) => o.mileageIn != null).map((o) => ({ at: o.at, km: o.mileageIn! })),
    ...(vehicle.mileage > 0 ? [{ at: toDate(vehicle.updatedAt).getTime(), km: vehicle.mileage }] : []),
  ].sort((a, b) => a.at - b.at)

  let kmPerDay = DEFAULT_KM_PER_DAY
  let estimatedFromHistory = false
  if (points.length >= 2) {
    const first = points[0]!, last = points[points.length - 1]!
    const days = (last.at - first.at) / DAY_MS
    if (days >= 30 && last.km > first.km) {
      kmPerDay = (last.km - first.km) / days
      estimatedFromHistory = true
    }
  }
  const latest = points.reduce<{ at: number; km: number } | null>((best, p) => (!best || p.km >= best.km ? p : best), null)
  const estimatedKm = latest ? Math.round(latest.km + kmPerDay * Math.max(0, (now - latest.at) / DAY_MS)) : null

  const items: MaintenanceItem[] = rules.map((rule) => {
    const keywords = rule.keywords.split(',').map((k) => normalize(k.trim())).filter(Boolean)
    const matches = (text: string) => keywords.some((k) => normalize(text).includes(k))
    const last = done.find((o) => o.serviceItems.some((s) => matches(s.description)) || o.partItems.some((p) => matches(p.name)))

    const base = {
      ruleId: rule.id, name: rule.name, intervalKm: rule.intervalKm, intervalMonths: rule.intervalMonths,
    }
    if (!last) {
      return { ...base, status: 'unknown' as const, lastDoneAt: null, lastDoneKm: null, lastOrderId: null, nextDueKm: null, nextDueAt: null, kmRemaining: null, daysRemaining: null }
    }

    const nextDueKm = rule.intervalKm != null && last.mileageIn != null ? last.mileageIn + rule.intervalKm : null
    const nextDue = rule.intervalMonths != null ? addMonths(new Date(last.at), rule.intervalMonths) : null
    const kmRemaining = nextDueKm != null && estimatedKm != null ? nextDueKm - estimatedKm : null
    const daysRemaining = nextDue ? Math.floor((nextDue.getTime() - now) / DAY_MS) : null

    // Aviso "pronto": faltan ≤ 10 % del intervalo en km (mín. 500) o ≤ 15 días
    const soonKm = rule.intervalKm != null ? Math.max(500, rule.intervalKm * 0.1) : 0
    const due = (kmRemaining != null && kmRemaining <= 0) || (daysRemaining != null && daysRemaining <= 0)
    const soon = !due && ((kmRemaining != null && kmRemaining <= soonKm) || (daysRemaining != null && daysRemaining <= 15))

    return {
      ...base,
      status: due ? 'due' : soon ? 'soon' : 'ok',
      lastDoneAt: new Date(last.at).toISOString(),
      lastDoneKm: last.mileageIn,
      lastOrderId: last.id,
      nextDueKm,
      nextDueAt: nextDue?.toISOString() ?? null,
      kmRemaining,
      daysRemaining,
    }
  })

  const order: Record<MaintenanceStatus, number> = { due: 0, soon: 1, ok: 2, unknown: 3 }
  items.sort((a, b) => order[a.status] - order[b.status])

  return {
    estimatedKm,
    kmPerDay: Math.round(kmPerDay),
    estimatedFromHistory,
    items,
  }
}

export async function getVehicleMaintenance(vehicleId: string) {
  const [vehicle, rules] = await Promise.all([loadVehicleForMaintenance(vehicleId), activeRules()])
  if (!vehicle) return null
  return computeMaintenance(vehicle, rules)
}

export type RuleInput = { name?: string; keywords?: string; intervalKm?: number | string | null; intervalMonths?: number | string | null; active?: boolean }

// Normaliza y valida lo que manda el formulario del backoffice
export function parseRule(body: RuleInput, partial = false): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {}
  const int = (v: unknown) => (v === '' || v == null ? null : Math.round(Number(v)))
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return { error: 'El nombre es obligatorio' }
    data['name'] = body.name.trim()
  }
  if (!partial || body.keywords !== undefined) {
    const kw = (body.keywords ?? '').split(',').map((k) => k.trim()).filter(Boolean).join(',')
    if (!kw) return { error: 'Indicá al menos una palabra clave (ej. aceite)' }
    data['keywords'] = kw
  }
  if (!partial || body.intervalKm !== undefined) data['intervalKm'] = int(body.intervalKm)
  if (!partial || body.intervalMonths !== undefined) data['intervalMonths'] = int(body.intervalMonths)
  for (const k of ['intervalKm', 'intervalMonths'] as const) {
    const v = data[k]
    if (v != null && (!Number.isFinite(v as number) || (v as number) <= 0)) return { error: 'Los intervalos deben ser mayores a cero' }
  }
  if (body.active !== undefined) data['active'] = !!body.active
  return { data }
}
