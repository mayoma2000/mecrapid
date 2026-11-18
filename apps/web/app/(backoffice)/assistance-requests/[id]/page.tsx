'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useRefreshTick } from '@/src/lib/refresh'
import { toDate } from '@/src/lib/job-time'

type AssistanceRequest = {
  id: string; detail: string; phone: string; status: string; createdAt: string
  latitude: number | null; longitude: number | null; workOrderId: string | null
  customer: { id: string; name: string; email: string | null; phone: string } | null
  assistanceType: { name: string; description: string | null } | null
  vehicle: { id: string; make: string; model: string; year: number; licensePlate: string } | null
  workOrder: { id: string; status: string; complaint: string } | null
  mechanic: { id: string; name: string } | null
  enRouteAt: string | null
  attendedAt: string | null
}
type Mechanic = { id: string; name: string }

// Asistencia = atención afuera: Pendiente → En camino → Atendida (o Cancelada)
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', en_route: 'En camino', attended: 'Atendida', cancelled: 'Cancelada',
}
const STATUS_CLS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', en_route: 'bg-blue-100 text-blue-700',
  attended: 'bg-green-100 text-green-700', cancelled: 'bg-neutral-100 text-neutral-600',
}
const hm = (s: string) => toDate(s).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AssistanceRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params['id'] as string
  const [req, setReq] = useState<AssistanceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [mechanicId, setMechanicId] = useState('')
  const [version, setVersion] = useState(0)
  const tick = useRefreshTick()

  useEffect(() => {
    void fetch(`/api/v1/assistance-requests/${id}`)
      .then((r) => r.json() as Promise<{ data: AssistanceRequest }>)
      .then(({ data }) => { setReq(data); setLoading(false) })
  }, [id, tick, version])

  useEffect(() => {
    void fetch('/api/v1/mechanics').then((r) => r.json() as Promise<{ data: Mechanic[] }>).then(({ data }) => setMechanics(data ?? []))
  }, [])

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError('')
    const res = await fetch(`/api/v1/assistance-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({})) as { error?: string; data?: { workOrderId?: string } }
    setBusy(false)
    if (!res.ok) { setError(json.error ?? 'Error'); return }
    // "Llevar al taller" abre la orden recién creada
    if (body['action'] === 'create_order' && json.data?.workOrderId) { router.push(`/work-orders/${json.data.workOrderId}`); return }
    setVersion((v) => v + 1)
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
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[req.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
          {STATUS_LABEL[req.status] ?? req.status}
        </span>
      </div>

      {/* Details card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
        <Row label="Cliente" value={req.customer?.name ?? '—'} />
        <Row label="Email" value={req.customer?.email ?? '—'} />
        <div className="px-5 py-3.5 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Teléfono</span>
          <a href={`tel:${req.phone.replace(/[^\d+]/g, '')}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">📞 {req.phone}</a>
        </div>
        <Row label="Mecánico" value={req.mechanic?.name ?? 'Sin asignar'} />
        {req.enRouteAt && <Row label="En camino desde" value={hm(req.enRouteAt)} />}
        {req.attendedAt && <Row label="Atendida" value={hm(req.attendedAt)} />}
        <Row label="Vehículo" value={req.vehicle ? `${req.vehicle.year} ${req.vehicle.make} ${req.vehicle.model} · ${req.vehicle.licensePlate}` : 'No indicado'} />
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
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Orden de taller (el carro entró al taller)</p>
          <Link href={`/work-orders/${req.workOrderId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Ver orden #{req.workOrderId.slice(0, 8).toUpperCase()} →
          </Link>
        </div>
      )}

      {/* Acciones: la asistencia se atiende afuera; la orden de taller es opcional */}
      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}
      <div className="flex gap-3 flex-wrap items-center">
        {req.status === 'pending' && (
          <>
            <select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)} className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white">
              <option value="">¿Qué mecánico va?</option>
              {mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={() => void act({ action: 'accept', mechanicId })} disabled={busy || !mechanicId}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
              🚗 Aceptar y enviar
            </button>
          </>
        )}
        {req.status === 'en_route' && (
          <button onClick={() => void act({ action: 'attend' })} disabled={busy}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            ✅ Marcar atendida
          </button>
        )}
        {req.status !== 'cancelled' && !req.workOrderId && (
          <button
            onClick={() => { if (window.confirm('¿El carro entra al taller? Se crea una orden de trabajo con este cliente, vehículo y problema.')) void act({ action: 'create_order' }) }}
            disabled={busy}
            className="px-5 py-2.5 bg-white dark:bg-neutral-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors">
            🏁 Llevar al taller (crear orden)
          </button>
        )}
        {(req.status === 'pending' || req.status === 'en_route') && (
          <button onClick={() => void act({ status: 'cancelled' })} disabled={busy}
            className="px-5 py-2.5 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Cancelar solicitud
          </button>
        )}
        {req.status === 'cancelled' && (
          <button onClick={() => void act({ status: 'pending' })} disabled={busy}
            className="px-5 py-2.5 bg-white dark:bg-neutral-900 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 text-sm font-semibold rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
            ↩ Reactivar (volver a pendiente)
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
