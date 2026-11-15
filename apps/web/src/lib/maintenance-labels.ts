// Textos de mantenimiento compartidos por las pantallas del backoffice
export const MAINT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  due:     { label: 'Ya toca',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          dot: '🔴' },
  soon:    { label: 'Pronto',      cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dot: '🟡' },
  ok:      { label: 'Al día',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  dot: '🟢' },
  unknown: { label: 'Sin registro', cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800',               dot: '⚪' },
}

export function everyLabel(km: number | null, months: number | null): string {
  return [
    km != null ? `${km.toLocaleString('es-HN')} km` : null,
    months != null ? `${months} ${months === 1 ? 'mes' : 'meses'}` : null,
  ].filter(Boolean).join(' o ')
}
