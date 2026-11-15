// Textos y colores de cotizaciones compartidos por las pantallas del backoffice
export const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft:              { label: 'Borrador',          cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
  sent:               { label: 'Esperando cliente', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved:           { label: 'Aprobada',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  partially_approved: { label: 'Aprobada en parte', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  rejected:           { label: 'Rechazada',         cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

export const PRIORITY: Record<string, { label: string; dot: string }> = {
  urgent:      { label: 'Urgente',     dot: '🔴' },
  recommended: { label: 'Recomendado', dot: '🟡' },
  optional:    { label: 'Opcional',    dot: '🟢' },
}

export const KIND_LABEL: Record<string, string> = { service: 'Servicio', part: 'Repuesto' }

export const money = (n: number) => `L. ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
