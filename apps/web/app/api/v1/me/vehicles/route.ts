import { db } from '@/src/prisma/db'
import { requireRole } from '@/src/lib/authz'
import { customerForEmail } from '@/src/lib/me'

// Vehículos de los que el cliente es dueño actualmente
export async function GET() {
  const g = await requireRole()
  if (!g.ok) return g.response

  const customer = await customerForEmail(g.session.user.email)
  if (!customer) return Response.json({ data: [] })

  const vehicles = await db.orm.public.Vehicle
    .where({ customerId: customer.id })
    .include('workOrders', (w) => w.where({ status: 'completed' }).count())
    .orderBy((v) => v.createdAt.asc())
    .all()

  return Response.json({
    data: vehicles.map((v) => ({
      id: v.id, make: v.make, model: v.model, year: v.year, licensePlate: v.licensePlate,
      color: v.color, mileage: v.mileage, servicesCount: v.workOrders,
    })),
  })
}
