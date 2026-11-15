import type { NextRequest } from 'next/server'
import { sendAppointmentReminders, sendMaintenanceReminders } from '@/src/lib/reminders'

// Vercel Cron (vercel.json) llama esto todos los días a las 8:00 a. m. de Honduras
export async function GET(request: NextRequest) {
  const secret = process.env['CRON_SECRET']
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const appointments = await sendAppointmentReminders()
  const maintenance = await sendMaintenanceReminders()
  return Response.json({ data: { appointments, maintenance } })
}
