import { db } from '@/src/prisma/db'

// El cliente de la app se vincula a su ficha de Customer por el correo de la cuenta
export async function customerForEmail(email: string) {
  return db.orm.public.Customer.where((c) => c.email.eq(email)).first()
}

// El vehículo pertenece (hoy) a ese cliente: evita que alguien use un carro ajeno
export async function ownVehicle(customerId: string, vehicleId: string) {
  const v = await db.orm.public.Vehicle.first({ id: vehicleId })
  return v && v.customerId === customerId && !v.deletedAt ? v : null
}

// Registro desde la app: vincula la cuenta nueva con su ficha de cliente (mismo correo).
// Si el taller ya lo tenía, completa el teléfono si faltaba; si no, crea la ficha.
export async function ensureCustomerForSignup(user: { name: string; email: string }, phone: string | null) {
  const existing = await customerForEmail(user.email)
  if (existing) {
    if (!existing.phone && phone) await db.orm.public.Customer.where({ id: existing.id }).update({ phone })
    return existing.id
  }
  const created = await db.orm.public.Customer.create({ name: user.name, email: user.email, phone: phone ?? '' })
  return created.id
}

// Cotización de una orden del cliente, solo si ya fue enviada (los borradores no se ven)
export async function findOwnQuote(email: string, id: string) {
  const customer = await customerForEmail(email)
  if (!customer) return null
  const quote = await db.orm.public.Quote
    .where({ id })
    .include('items')
    .include('workOrder', (w) => w.include('vehicle'))
    .first()
  if (!quote || quote.status === 'draft' || !quote.workOrder || quote.workOrder.customerId !== customer.id) return null
  return { ...quote, workOrder: quote.workOrder }
}
