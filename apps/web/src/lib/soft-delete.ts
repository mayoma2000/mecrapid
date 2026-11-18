import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'

// "Eliminar" un cliente o vehículo no borra la fila: queda marcado como eliminado para
// conservar su historial (órdenes, cotizaciones, citas). Se puede restaurar.

// Cuenta de la app del cliente (solo rol cliente; las del personal no se tocan)
async function clientAccount(email: string | null) {
  if (!email) return null
  const user = await db.orm.public.User.where((u) => u.email.eq(email.toLowerCase())).first()
  return user && user.role !== 'admin' && user.role !== 'mecanico' ? user : null
}

export async function softDeleteCustomer(id: string, byUserId: string) {
  const customer = await db.orm.public.Customer.first({ id })
  if (!customer) return { ok: false as const, status: 404, error: 'Not found' }
  if (customer.deletedAt) return { ok: true as const }
  await db.orm.public.Customer.where({ id }).update({ deletedAt: new Date().toISOString(), deletedById: byUserId })
  // Un cliente eliminado no puede seguir entrando a la app
  const account = await clientAccount(customer.email)
  if (account && !account.banned) {
    await auth.api.banUser({ headers: await headers(), body: { userId: account.id, banReason: 'Cliente eliminado del taller' } })
  }
  return { ok: true as const }
}

export async function restoreCustomer(id: string) {
  const customer = await db.orm.public.Customer.first({ id })
  if (!customer) return { ok: false as const, status: 404, error: 'Not found' }
  await db.orm.public.Customer.where({ id }).update({ deletedAt: null, deletedById: null })
  const account = await clientAccount(customer.email)
  if (account?.banned && account.banReason === 'Cliente eliminado del taller') {
    await auth.api.unbanUser({ headers: await headers(), body: { userId: account.id } })
  }
  return { ok: true as const }
}

export async function setVehicleDeleted(id: string, byUserId: string | null) {
  const vehicle = await db.orm.public.Vehicle.first({ id })
  if (!vehicle) return { ok: false as const, status: 404, error: 'Not found' }
  await db.orm.public.Vehicle.where({ id }).update(
    byUserId ? { deletedAt: new Date().toISOString(), deletedById: byUserId } : { deletedAt: null, deletedById: null },
  )
  return { ok: true as const }
}

// Antes de crear una orden o cita: el cliente y el vehículo tienen que existir y estar activos
export async function checkActive(customerId: string, vehicleId?: string | null): Promise<string | null> {
  const customer = await db.orm.public.Customer.first({ id: customerId })
  if (!customer) return 'Cliente no encontrado'
  if (customer.deletedAt) return 'El cliente está eliminado: restauralo primero'
  if (vehicleId) {
    const vehicle = await db.orm.public.Vehicle.first({ id: vehicleId })
    if (!vehicle) return 'Vehículo no encontrado'
    if (vehicle.deletedAt) return 'El vehículo está eliminado: restauralo primero'
    if (vehicle.customerId !== customerId) return 'El vehículo no es de ese cliente'
  }
  return null
}
