import { connection } from 'next/server'
import { db } from '@/src/prisma/db'

export const instant = false

type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled'

export default async function DashboardPage() {
  await connection()

  // "Hoy" en hora de Honduras (UTC-6 todo el año); el servidor corre en UTC
  const HN_OFFSET_MS = 6 * 60 * 60 * 1000
  const hnNow = new Date(Date.now() - HN_OFFSET_MS)
  const todayStart = new Date(Date.UTC(hnNow.getUTCFullYear(), hnNow.getUTCMonth(), hnNow.getUTCDate()) + HN_OFFSET_MS)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  const activeStatuses: WorkOrderStatus[] = ['assigned', 'in_progress', 'quality_check']

  const [customersAgg, ordersAgg, appointmentsAgg, quotesAgg, assistanceAgg] = await Promise.all([
    db.orm.public.Customer.aggregate((a) => ({ count: a.count() })),
    db.orm.public.WorkOrder
      .where((o) => o.status.in(activeStatuses))
      .aggregate((a) => ({ count: a.count() })),
    db.orm.public.Appointment
      .where((a) => a.scheduledAt.gte(todayStart.toISOString()))
      .where((a) => a.scheduledAt.lte(todayEnd.toISOString()))
      .where((a) => a.status.neq('cancelled' as AppointmentStatus))
      .aggregate((a) => ({ count: a.count() })),
    db.orm.public.Quote.where({ status: 'sent' }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.AssistanceRequest.where({ status: 'pending' }).aggregate((a) => ({ count: a.count() })),
  ])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tablero</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Clientes" value={customersAgg.count} href="/customers" />
        <KPICard label="Órdenes en proceso" value={ordersAgg.count} href="/work-orders" />
        <KPICard label="Citas para hoy" value={appointmentsAgg.count} href="/appointments" />
        <KPICard label="Cotizaciones esperando cliente" value={quotesAgg.count} href="/quotes" />
        <KPICard label="Asistencias pendientes" value={assistanceAgg.count} href="/assistance-requests" />
      </div>
    </div>
  )
}

function KPICard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </a>
  )
}
