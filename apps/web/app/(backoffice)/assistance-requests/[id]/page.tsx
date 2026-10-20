'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type AssistanceRequest = {
  id: string; detail: string; phone: string; status: string; createdAt: string
  latitude: number | null; longitude: number | null; workOrderId: string | null
  customer: { id: string; name: string; email: string | null; phone: string } | null
  assistanceType: { name: string; description: string | null } | null
  workOrder: { id: string; status: string; complaint: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', active: 'Activa', completed: 'Completada', cancelled: 'Cancelada',
}

export default function AssistanceRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params['id'] as string
  const [req, setReq] = useState<AssistanceRequest | null>(null)
  const [activating, setActivating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/v1/assistance-requests/${id}`)
      .then((r) => r.json() as Promise<{ data: AssistanceRequest }>)
      .then(({ data }) => { setReq(data); setLoading(false) })
  }, [id])

  async function handleActivate() {
    setActivating(true)
    const res = await fetch(`/api/v1/assistance-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate' }),
    })
    if (res.ok) {
      const json = await res.json() as { data: AssistanceRequest }
      setReq((prev) => prev ? { ...prev, status: json.data.status, workOrderId: json.data.workOrderId } : prev)
    }
    setActivating(false)
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/v1/assistance-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReq((prev) => prev ? { ...prev, status } : prev)
  }

  if (loading) return <div className="p-6 text-sm text-neutral-400">Cargando…</div>
  if (!req) return <div className="p-6 text-sm text-red-500">No encontrado</div>

  const mapsUrl = req.latitude && req.longitude
    ? `https://maps.google.com/?q=${req.latitude},${req.longitude}`
    : null

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">←</button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Solicitud de Asistencia</h1>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : req.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'}`}>
          {STATUS_LABEL[req.status] ?? req.status}
        </span>
      </div>

      {/* Details card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
        <Row label="Cliente" value={req.customer?.name ?? '—'} />
        <Row label="Email" value={req.customer?.email ?? '—'} />
        <Row label="Teléfono" value={req.phone} />
        <Row label="Tipo de asistencia" value={req.assistanceType?.name ?? '—'} />
        {req.assistanceType?.description && <Row label="Descripción del tipo" value={req.assistanceType.description} />}
        <Row label="Detalle" value={req.detail} />
        <Row label="Fecha" value={new Date(req.createdAt).toLocaleString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        {mapsUrl ? (
          <div className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Ubicación</span>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {req.latitude?.toFixed(5)}, {req.longitude?.toFixed(5)} → Ver en Maps
            </a>
          </div>
        ) : (
          <Row label="Ubicación" value="No proporcionada" />
        )}
      </div>

      {/* WorkOrder link */}
      {req.workOrderId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Orden de trabajo generada</p>
          <Link href={`/work-orders/${req.workOrderId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Ver orden #{req.workOrderId.slice(0, 8).toUpperCase()} →
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {req.status === 'pending' && !req.workOrderId && (
          <button onClick={() => void handleActivate()} disabled={activating}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {activating ? 'Activando…' : '⚡ Activar → Crear Orden'}
          </button>
        )}
        {req.status === 'active' && (
          <button onClick={() => void handleStatusChange('completed')}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
            ✓ Marcar completada
          </button>
        )}
        {req.status !== 'cancelled' && req.status !== 'completed' && (
          <button onClick={() => void handleStatusChange('cancelled')}
            className="px-5 py-2.5 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Cancelar solicitud
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3.5 flex items-start justify-between gap-4">
      <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">{label}</span>
      <span className="text-sm text-neutral-900 dark:text-white text-right">{value}</span>
    </div>
  )
}
