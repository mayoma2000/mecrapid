import type { NextRequest } from 'next/server'
import { db } from '@/src/prisma/db'
import { customerUserIds, notifyUsers } from '@/src/lib/notify'
import { toDate } from '@/src/lib/job-time'

// Honduras está en UTC-6 todo el año (sin horario de verano)
const HN_OFFSET_MS = 6 * 60 * 60 * 1000

// Vercel Cron (vercel.json) llama esto todos los días a las 8:00 a. m. de Honduras.
// Avisa a cada cliente que tiene cita mañana; reminderSentAt evita mandarlo dos veces.
export async function GET(request: NextRequest) {
  const secret = process.env['CRON_SECRET']
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // "Mañana" en hora de Honduras, expresado en UTC
  const hnNow = new Date(Date.now() - HN_OFFSET_MS)
  const startUtc = Date.UTC(hnNow.getUTCFullYear(), hnNow.getUTCMonth(), hnNow.getUTCDate() + 1) + HN_OFFSET_MS
  const from = new Date(startUtc).toISOString()
  const to = new Date(startUtc + 24 * 60 * 60 * 1000).toISOString()

  const appointments = await db.orm.public.Appointment
    .where((a) => a.scheduledAt.gte(from))
    .where((a) => a.scheduledAt.lt(to))
    .where((a) => a.status.in(['scheduled', 'confirmed']))
    .where((a) => a.reminderSentAt.isNull())
    .all()

  let sent = 0
  for (const appt of appointments) {
    const time = toDate(appt.scheduledAt).toLocaleTimeString('es-HN', {
      timeZone: 'America/Tegucigalpa', hour: 'numeric', minute: '2-digit',
    })
    try {
      await notifyUsers(await customerUserIds(appt.customerId), {
        type: 'appointment_reminder',
        title: '⏰ Mañana tenés cita en el taller',
        // La hora ya termina en "p. m.": el texto sigue con guion para no duplicar el punto
        body: `${appt.serviceType} a las ${time} — si no podés llegar, reagendá desde la app`,
        url: `/my-appointment/${appt.id}`,
      })
      await db.orm.public.Appointment.where({ id: appt.id }).update({ reminderSentAt: new Date().toISOString() })
      sent++
    } catch (err) {
      console.error('[cron] recordatorio de cita', appt.id, err)
    }
  }

  return Response.json({ data: { window: { from, to }, found: appointments.length, sent } })
}
