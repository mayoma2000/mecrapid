import { db } from '@/src/prisma/db'

// El cliente de la app se vincula a su ficha de Customer por el correo de la cuenta
export async function customerForEmail(email: string) {
  return db.orm.public.Customer.where((c) => c.email.eq(email)).first()
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
