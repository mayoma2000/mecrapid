import { safeDate } from './date'

export type MaintenanceItem = {
  ruleId: string
  name: string
  intervalKm: number | null
  intervalMonths: number | null
  status: 'ok' | 'soon' | 'due' | 'unknown'
  lastDoneAt: string | null
  lastDoneKm: number | null
  nextDueKm: number | null
  nextDueAt: string | null
  kmRemaining: number | null
  daysRemaining: number | null
}
export type Maintenance = { estimatedKm: number | null; kmPerDay: number; estimatedFromHistory: boolean; items: MaintenanceItem[] }

export const MAINT_STATUS: Record<MaintenanceItem['status'], { label: string; bg: string; color: string }> = {
  due:     { label: 'Ya toca',      bg: '#FEE8EC', color: '#F5365C' },
  soon:    { label: 'Pronto',       bg: '#FFF5EC', color: '#FB6340' },
  ok:      { label: 'Al día',       bg: '#E6FAF3', color: '#2DCE89' },
  unknown: { label: 'Sin registro', bg: '#F1F2F6', color: '#8898AA' },
}

export function everyLabel(km: number | null, months: number | null): string {
  return [
    km != null ? `${km.toLocaleString('es-HN')} km` : null,
    months != null ? `${months} ${months === 1 ? 'mes' : 'meses'}` : null,
  ].filter(Boolean).join(' o ')
}

// "Próximo: 85,000 km o 30 nov" / "Faltan ~1,200 km o 15 días"
export function nextLabel(m: MaintenanceItem): string {
  if (!m.lastDoneAt) return 'No se ha hecho en el taller'
  const parts = [
    m.nextDueKm != null ? `${m.nextDueKm.toLocaleString('es-HN')} km` : null,
    m.nextDueAt ? safeDate(m.nextDueAt).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
  ].filter(Boolean)
  return `Próximo: ${parts.join(' o ')}`
}
