'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type WorkOrder = { id: string; status: string; complaint: string; customer: { name: string }; vehicle: { make: string; model: string; year: number; licensePlate: string } }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignado', in_progress: 'En Proceso',
  quality_check: 'Control Calidad', completed: 'Completado', cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  quality_check: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const TABS = [
  { key: 'active', label: 'Activas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
]

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [tab, setTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    void fetch(`/api/v1/work-orders?status=${tab}&limit=50`)
      .then((r) => r.json() as Promise<{ data: WorkOrder[] }>)
      .then(({ data }) => { setOrders(data); setLoading(false) })
  }, [tab])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Órdenes de Servicio</h1>
        <Link href="/work-orders/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nueva
        </Link>
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin órdenes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Cliente / Vehículo</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Problema</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer" onClick={() => router.push(`/work-orders/${o.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 dark:text-white">{o.customer.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{o.vehicle.year} {o.vehicle.make} {o.vehicle.model} · {o.vehicle.licensePlate}</p>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{o.complaint}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[o.status] ?? ''}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
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
