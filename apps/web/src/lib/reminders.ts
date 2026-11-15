import { db } from '@/src/prisma/db'
import { customerUserIds, notifyUsers } from '@/src/lib/notify'
import { toDate } from '@/src/lib/job-time'
import { activeRules, computeMaintenance } from '@/src/lib/maintenance'

// Honduras está en UTC-6 todo el año (sin horario de verano)
const HN_OFFSET_MS = 6 * 60 * 60 * 1000

// Avisa a cada cliente que tiene cita mañana; reminderSentAt evita mandarlo dos veces
export async function sendAppointmentReminders() {
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
  return { window: { from, to }, found: appointments.length, sent }
}

// Recordatorio de mantenimiento: un aviso cuando se acerca ("pronto") y otro cuando ya toca,
// por cada ciclo (se reinicia cuando el servicio se vuelve a hacer en el taller)
export async function sendMaintenanceReminders() {
  const rules = await activeRules()
  if (rules.length === 0) return { vehicles: 0, sent: 0 }

  const vehicles = await db.orm.public.Vehicle
    .include('workOrders', (w) => w.where({ status: 'completed' }).include('serviceItems').include('partItems'))
    .include('maintenanceReminders')
    .all()

  let sent = 0
  for (const vehicle of vehicles) {
    if (vehicle.workOrders.length === 0) continue
    const { items } = computeMaintenance(vehicle, rules)
    for (const item of items) {
      if (item.status !== 'soon' && item.status !== 'due') continue
      const cycleKey = item.lastOrderId ?? 'never'
      const already = vehicle.maintenanceReminders.some(
        (r) => r.ruleId === item.ruleId && r.cycleKey === cycleKey && r.level === item.status,
      )
      if (already) continue

      const every = [
        item.intervalKm != null ? `${item.intervalKm.toLocaleString('es-HN')} km` : null,
        item.intervalMonths != null ? `${item.intervalMonths} ${item.intervalMonths === 1 ? 'mes' : 'meses'}` : null,
      ].filter(Boolean).join(' o ')
      try {
        await notifyUsers(await customerUserIds(vehicle.customerId), {
          type: `maintenance_${item.status}`,
          title: item.status === 'due'
            ? `🛠️ A tu ${vehicle.make} ${vehicle.model} le toca: ${item.name.toLowerCase()}`
            : `🔔 Pronto le toca a tu ${vehicle.make} ${vehicle.model}: ${item.name.toLowerCase()}`,
          body: `Se recomienda cada ${every}. Agendá tu cita desde la app y te lo dejamos listo.`,
          url: `/my-vehicle/${vehicle.id}`,
        })
        await db.orm.public.MaintenanceReminder.create({ vehicleId: vehicle.id, ruleId: item.ruleId, cycleKey, level: item.status })
        sent++
      } catch (err) {
        console.error('[cron] recordatorio de mantenimiento', vehicle.id, item.ruleId, err)
      }
    }
  }
  return { vehicles: vehicles.length, sent }
}
