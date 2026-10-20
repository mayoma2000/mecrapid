import type { NextRequest } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/src/prisma/db'

export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await db.orm.public.Customer
    .where((c) => c.email.eq(session.user.email))
    .limit(1)
    .all()

  if (customers.length === 0) {
    return Response.json({ data: [], meta: { total: 0 } })
  }

  const customer = customers[0]!

  const appointments = await db.orm.public.Appointment
    .where((a) => a.customerId.eq(customer.id))
    .orderBy((a) => a.scheduledAt.desc())
    .all()

  return Response.json({ data: appointments, meta: { total: appointments.length } })
}
