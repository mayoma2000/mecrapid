import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { transferVehicle } from '@/src/lib/vehicle-history'
import { customerUserIds, notifyLater } from '@/src/lib/notify'
import { db } from '@/src/prisma/db'

type Ctx = { params: Promise<{ id: string }> }

// Cambio de dueño (venta, traspaso). Solo admin: afecta qué cliente ve el carro.
export async function POST(request: NextRequest, ctx: Ctx) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const { id } = await ctx.params
  const { customerId, note } = await request.json() as { customerId?: string; note?: string }
  if (!customerId) return Response.json({ error: 'Elegí el nuevo dueño' }, { status: 400 })

  const result = await transferVehicle(id, customerId, g.session.user.id, note)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  const vehicle = await db.orm.public.Vehicle.first({ id })
  if (vehicle) {
    notifyLater(() => customerUserIds(customerId), {
      type: 'vehicle_transferred_in',
      title: `🚗 ${vehicle.make} ${vehicle.model} ya está en tu cuenta`,
      body: 'Podés ver su historial de servicios en el taller desde la app.',
      url: `/my-vehicle/${id}`,
    })
  }
  return Response.json({ data: { ok: true } })
}
