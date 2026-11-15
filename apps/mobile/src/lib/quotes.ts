export type QuoteItem = {
  id: string
  kind: 'service' | 'part'
  description: string
  quantity: number
  unitPrice: number
  priority: 'urgent' | 'recommended' | 'optional'
  decision: 'pending' | 'approved' | 'rejected'
}

export type Quote = {
  id: string
  workOrderId: string
  status: 'draft' | 'sent' | 'approved' | 'partially_approved' | 'rejected'
  notes: string | null
  taxRate: number
  sentAt: string | null
  respondedAt: string | null
  respondedVia: 'app' | 'staff' | null
  responseNote: string | null
  items: QuoteItem[]
  subtotal: number
  tax: number
  total: number
  approvedSubtotal: number
  approvedTotal: number
  // Solo en las rutas del cliente (/me/quotes)
  vehicle?: { make: string; model: string; year: number; licensePlate: string } | null
  workOrder?: { id: string; complaint: string; status: string }
}

export const QUOTE_STATUS: Record<Quote['status'], { label: string; bg: string; color: string }> = {
  draft:              { label: 'Borrador',          bg: '#F8F9FA', color: '#8898AA' },
  sent:               { label: 'Por aprobar',       bg: '#FFF5EC', color: '#FB6340' },
  approved:           { label: 'Aprobada',          bg: '#E6FAF3', color: '#2DCE89' },
  partially_approved: { label: 'Aprobada en parte', bg: '#EEF0FD', color: '#5E72E4' },
  rejected:           { label: 'Rechazada',         bg: '#FEE8EC', color: '#F5365C' },
}

export const PRIORITY: Record<QuoteItem['priority'], { label: string; dot: string; hint: string }> = {
  urgent:      { label: 'Urgente',     dot: '🔴', hint: 'Afecta la seguridad o puede causar daños mayores' },
  recommended: { label: 'Recomendado', dot: '🟡', hint: 'Conviene hacerlo pronto' },
  optional:    { label: 'Opcional',    dot: '🟢', hint: 'Puede esperar' },
}

export const money = (n: number) =>
  `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
