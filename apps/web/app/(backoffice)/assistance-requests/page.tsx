'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type AssistanceRequest = {
  id: string; detail: string; phone: string; status: string; createdAt: string
  customer: { name: string; email: string | null } | null
  assistanceType: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', active: 'Activa', completed: 'Completada', cancelled: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const FILTERS = ['all', 'pending', 'active', 'completed', 'cancelled']

export default function AssistanceRequestsPage() {
  const [requests, setRequests] = useState<AssistanceRequest[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    const qs = filter !== 'all' ? `?status=${filter}` : ''
    void fetch(`/api/v1/assistance-requests${qs}`)
      .then((r) => r.json() as Promise<{ data: AssistanceRequest[] }>)
      .then(({ data }) => { setRequests(data); setLoading(false) })
  }, [filter])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Solicitudes de Asistencia</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${filter === f ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
            {f === 'all' ? 'Todas' : STATUS_LABEL[f] ?? f}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin solicitudes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/assistance-requests/${r.id}`)}
                  className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer">
                  <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">{r.customer?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{r.assistanceType?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{r.phone}</td>
                  <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs">{new Date(r.createdAt).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs text-neutral-400">Ver →</span>
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
