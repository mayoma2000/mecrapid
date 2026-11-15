import { after } from 'next/server'
import { db } from '@/src/prisma/db'
import { toDate } from '@/src/lib/job-time'

export type NotificationInput = {
  type: string
  title: string
  body: string
  // Ruta de la app móvil a la que lleva el aviso al tocarlo (expo-router)
  url?: string | null
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } }

// Envía por la API de push de Expo (lotes de 100) y borra los tokens de teléfonos
// que ya no existen (app desinstalada, sesión de otro usuario)
async function sendPush(tokens: string[], n: NotificationInput) {
  const accessToken = process.env['EXPO_ACCESS_TOKEN']
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100)
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch.map((to) => ({
        to, title: n.title, body: n.body, sound: 'default', data: { url: n.url ?? null, type: n.type },
      }))),
    })
    if (!res.ok) {
      console.error('[push] Expo respondió', res.status, await res.text().catch(() => ''))
      continue
    }
    const { data } = await res.json() as { data: ExpoTicket[] }
    const dead = batch.filter((_, idx) => data[idx]?.details?.error === 'DeviceNotRegistered')
    if (dead.length > 0) await db.orm.public.PushToken.where((t) => t.token.in(dead)).deleteAll()
  }
}

// Guarda el aviso en la bandeja de cada usuario y lo manda como push a sus teléfonos
export async function notifyUsers(userIds: (string | null | undefined)[], n: NotificationInput) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) return

  for (const userId of ids) {
    await db.orm.public.Notification.create({ userId, type: n.type, title: n.title, body: n.body, url: n.url ?? null })
  }
  const tokens = await db.orm.public.PushToken.where((t) => t.userId.in(ids)).all()
  if (tokens.length > 0) await sendPush(tokens.map((t) => t.token), n)
}

// Igual que notifyUsers pero después de responder, para no demorar la respuesta de la API.
// Un fallo al notificar nunca rompe la operación que lo disparó.
export function notifyLater(resolveUserIds: () => Promise<(string | null | undefined)[]>, n: NotificationInput) {
  after(async () => {
    try {
      await notifyUsers(await resolveUserIds(), n)
    } catch (err) {
      console.error('[notify]', n.type, err)
    }
  })
}

// ── Destinatarios ──────────────────────────────────────────────────────────

// Cuentas de la app vinculadas a la ficha del cliente (por correo)
export async function customerUserIds(customerId: string): Promise<string[]> {
  const customer = await db.orm.public.Customer.first({ id: customerId })
  if (!customer?.email) return []
  const users = await db.orm.public.User.where((u) => u.email.eq(customer.email!)).all()
  return users.map((u) => u.id)
}

export async function adminUserIds(): Promise<string[]> {
  const admins = await db.orm.public.User.where((u) => u.role.eq('admin')).all()
  return admins.filter((u) => !u.banned).map((u) => u.id)
}

// Admins + el mecánico asignado a la orden (si hay)
export async function staffForOrder(workOrderId: string): Promise<string[]> {
  const order = await db.orm.public.WorkOrder.first({ id: workOrderId })
  return [...(await adminUserIds()), ...(order?.mechanicId ? [order.mechanicId] : [])]
}

export function vehicleLabel(v: { make: string; model: string } | null | undefined): string {
  return v ? `${v.make} ${v.model}` : 'tu vehículo'
}

// El servidor corre en UTC: las fechas de los avisos se escriben en hora de Honduras
export function hnDateTime(iso: string): string {
  return toDate(iso).toLocaleString('es-HN', {
    timeZone: 'America/Tegucigalpa', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  })
}
