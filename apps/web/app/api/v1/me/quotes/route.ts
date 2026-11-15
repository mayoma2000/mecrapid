import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { customerForEmail } from '@/src/lib/me'
import { serializeQuote } from '@/src/lib/quotes'

// Cotizaciones del cliente (las enviadas y respondidas; los borradores no se ven)
export async function GET() {
  const g = await requireRole()
  if (!g.ok) return g.response

  const customer = await customerForEmail(g.session.user.email)
  if (!customer) return Response.json({ data: [], meta: { total: 0, pending: 0 } })

  const orders = await db.orm.public.WorkOrder
    .where({ customerId: customer.id })
    .include('vehicle')
    .include('quotes', (q) => q.where((x) => x.status.neq('draft')).include('items'))
    .all()

  const data = orders
    .flatMap((o) => o.quotes.map((q) => ({
      ...serializeQuote(q),
      workOrder: { id: o.id, complaint: o.complaint, status: o.status },
      vehicle: o.vehicle ? { make: o.vehicle.make, model: o.vehicle.model, year: o.vehicle.year, licensePlate: o.vehicle.licensePlate } : null,
    })))
    // Primero las que esperan respuesta, luego las más recientes
    .sort((a, b) => Number(b.status === 'sent') - Number(a.status === 'sent') || (b.sentAt ?? '').localeCompare(a.sentAt ?? ''))

  return Response.json({ data, meta: { total: data.length, pending: data.filter((q) => q.status === 'sent').length } })
}
