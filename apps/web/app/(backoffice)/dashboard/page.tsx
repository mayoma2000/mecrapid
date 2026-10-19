import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/src/prisma/db'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [totalCustomers, ordersInProgress, todayAppointments] = await Promise.all([
    db.orm.public.Customer.count(),
    db.orm.public.WorkOrder
      .where({ status: { in: ['assigned', 'in_progress', 'quality_check'] } })
      .count(),
    db.orm.public.Appointment
      .where({
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          lt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        },
        status: { not: 'cancelled' },
      })
      .count(),
  ])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tablero</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Clientes" value={totalCustomers} href="/customers" />
        <KPICard label="Órdenes en proceso" value={ordersInProgress} href="/work-orders" />
        <KPICard label="Citas para hoy" value={todayAppointments} href="/appointments" />
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
