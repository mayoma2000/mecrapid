'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Appointment = {
  id: string; scheduledAt: string; serviceType: string; status: string; notes: string | null
  customer: { name: string }
  vehicle: { make: string; model: string; year: number; licensePlate: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada', confirmed: 'Confirmada', in_progress: 'En Progreso',
  completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
}
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    const to = new Date()
    to.setDate(to.getDate() + 30)
    void fetch(`/api/v1/appointments?from=${from.toISOString()}&to=${to.toISOString()}&limit=100`)
      .then((r) => r.json() as Promise<{ data: Appointment[] }>)
      .then(({ data }) => { setAppointments(data); setLoading(false) })
  }, [])

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Citas</h1>
        <Link href="/appointments/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nueva
        </Link>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin citas próximas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Cliente</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Servicio</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer" onClick={() => router.push(`/appointments/${a.id}`)}>
                  <td className="px-4 py-3 text-neutral-900 dark:text-white font-medium whitespace-nowrap">{fmt(a.scheduledAt)}</td>
                  <td className="px-4 py-3">
                    <p className="text-neutral-900 dark:text-white">{a.customer.name}</p>
                    {a.vehicle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{a.vehicle.licensePlate}</p>}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-neutral-600 dark:text-neutral-400">{a.serviceType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] ?? ''}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
