import { db } from '@/src/prisma/db'

// Quién mira el historial:
//  - staff: todo (dueños con nombre, todas las órdenes, precios, mecánico)
//  - customer: el dueño actual. Ve completas sus propias órdenes; de los dueños
//    anteriores solo qué se le hizo al carro, cuándo y con qué kilometraje
//    (sin nombre, sin precios, sin el problema que reportaron).
export type HistoryViewer = { kind: 'staff' } | { kind: 'customer'; customerId: string }

const round2 = (n: number) => Math.round(n * 100) / 100

export async function getVehicleHistory(vehicleId: string, viewer: HistoryViewer) {
  const vehicle = await db.orm.public.Vehicle
    .where({ id: vehicleId })
    .include('ownerships', (o) => o.include('customer'))
    .include('workOrders', (w) => w.include('serviceItems').include('partItems').include('mechanic').include('customer'))
    .first()
  if (!vehicle) return null

  const isStaff = viewer.kind === 'staff'
  if (!isStaff && vehicle.customerId !== viewer.customerId) return null

  const ownerships = [...vehicle.ownerships].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const orders = [...vehicle.workOrders]
    // El cliente solo ve trabajos terminados; el taller ve todo
    .filter((o) => isStaff || o.status === 'completed')
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt))

  const entries = orders.map((o) => {
    const own = isStaff || o.customerId === (viewer as { customerId: string }).customerId
    const services = o.serviceItems.map((s) => ({ description: s.description, ...(own ? { cost: s.cost } : {}) }))
    const parts = o.partItems.map((p) => ({ name: p.name, quantity: p.quantity, ...(own ? { total: p.totalPrice } : {}) }))
    const total = round2(o.serviceItems.reduce((s, i) => s + i.cost, 0) + o.partItems.reduce((s, i) => s + i.totalPrice, 0))
    return {
      id: o.id,
      date: o.completedAt ?? o.createdAt,
      mileage: o.mileageIn,
      previousOwner: !isStaff && !own,
      services,
      parts,
      ...(own
        ? { status: o.status, complaint: o.complaint, diagnosis: o.diagnosis, total, estimatedCost: o.estimatedCost }
        : {}),
      ...(isStaff
        ? { customer: o.customer ? { id: o.customer.id, name: o.customer.name } : null, mechanic: o.mechanic?.name ?? null }
        : {}),
    }
  })

  const current = ownerships.find((x) => !x.endedAt)
  return {
    vehicle: {
      id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year,
      licensePlate: vehicle.licensePlate, vin: vehicle.vin, color: vehicle.color, mileage: vehicle.mileage,
    },
    owners: isStaff
      ? ownerships.map((x) => ({
          customerId: x.customerId, name: x.customer?.name ?? '—', startedAt: x.startedAt, endedAt: x.endedAt, note: x.note,
        }))
      : undefined,
    // Para el cliente: desde cuándo es dueño y cuántos dueños tuvo antes
    ownerSince: current?.startedAt ?? null,
    previousOwners: ownerships.filter((x) => x.endedAt).length,
    entries,
    summary: {
      services: entries.length,
      lastServiceAt: entries[0]?.date ?? null,
      lastMileage: entries.find((e) => e.mileage != null)?.mileage ?? null,
    },
  }
}

// Cambio de dueño: cierra el tramo del dueño actual y abre uno nuevo, todo junto
export async function transferVehicle(vehicleId: string, newCustomerId: string, byUserId: string, note?: string | null) {
  return db.transaction(async (tx) => {
    const vehicle = await tx.orm.public.Vehicle.where({ id: vehicleId }).forUpdate().first()
    if (!vehicle) return { ok: false as const, status: 404, error: 'Vehículo no encontrado' }
    if (vehicle.customerId === newCustomerId) return { ok: false as const, status: 400, error: 'Ese cliente ya es el dueño' }
    const customer = await tx.orm.public.Customer.first({ id: newCustomerId })
    if (!customer) return { ok: false as const, status: 400, error: 'Cliente no encontrado' }

    const now = new Date().toISOString()
    await tx.orm.public.VehicleOwnership
      .where({ vehicleId })
      .where((o) => o.endedAt.isNull())
      .updateAll({ endedAt: now })
    await tx.orm.public.VehicleOwnership.create({
      vehicleId, customerId: newCustomerId, startedAt: now, createdById: byUserId, note: note?.trim() || null,
    })
    await tx.orm.public.Vehicle.where({ id: vehicleId }).update({ customerId: newCustomerId })
    return { ok: true as const, previousCustomerId: vehicle.customerId }
  })
}
