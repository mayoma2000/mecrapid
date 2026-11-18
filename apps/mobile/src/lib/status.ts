// Colores y textos de estado de órdenes, citas y solicitudes en la app del cliente
export function statusColor(status: string) {
  if (status === 'completed' || status === 'done') return '#2DCE89'
  if (status === 'cancelled') return '#F5365C'
  if (status === 'attended') return '#2DCE89'
  if (status === 'en_route') return '#5E72E4'
  if (status === 'in_progress' || status === 'confirmed' || status === 'active') return '#FB6340'
  if (status === 'scheduled') return '#5E72E4'
  return '#8898AA'
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    active: 'Activa',
    completed: 'Completado',
    done: 'Completado',
    cancelled: 'Cancelado',
    confirmed: 'Confirmada',
    scheduled: 'Programada',
    en_route: 'En camino',
    attended: 'Atendida',
  }
  return map[status] ?? status
}
