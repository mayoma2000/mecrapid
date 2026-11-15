import type { NextRequest } from 'next/server'
import { requireRole, STAFF_ROLES } from '@/src/lib/authz'
import { getVehicleHistory } from '@/src/lib/vehicle-history'
import { getVehicleMaintenance } from '@/src/lib/maintenance'

type Ctx = { params: Promise<{ id: string }> }

// Historial completo del vehículo para el taller: todos los dueños y todas las órdenes
export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await requireRole(STAFF_ROLES)
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const history = await getVehicleHistory(id, { kind: 'staff' })
  if (!history) return Response.json({ error: 'Not found' }, { status: 404 })
  // Estado de mantenimiento preventivo (cambio de aceite, llantas, frenos…)
  const maintenance = await getVehicleMaintenance(id)
  return Response.json({ data: { ...history, maintenance } })
}
