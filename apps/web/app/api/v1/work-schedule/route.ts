import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'

export async function GET() {
  const schedule = await db.orm.public.WorkSchedule
    .orderBy((s) => s.dayOfWeek.asc())
    .all()

  return Response.json({ data: schedule })
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body)) {
    return Response.json({ error: 'Body must be an array of 7 schedule rows' }, { status: 400 })
  }

  const results = await Promise.all(
    body.map(async (row: { dayOfWeek: number; startHour: number; endHour: number; active: boolean }) => {
      const existing = await db.orm.public.WorkSchedule.first({ dayOfWeek: row.dayOfWeek })
      if (existing) {
        return db.orm.public.WorkSchedule.where({ dayOfWeek: row.dayOfWeek }).update({
          startHour: Number(row.startHour),
          endHour: Number(row.endHour),
          active: Boolean(row.active),
        })
      } else {
        return db.orm.public.WorkSchedule.create({
          dayOfWeek: Number(row.dayOfWeek),
          startHour: Number(row.startHour),
          endHour: Number(row.endHour),
          active: Boolean(row.active),
        })
      }
    }),
  )

  return Response.json({ data: results })
}
