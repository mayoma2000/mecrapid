'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/src/lib/auth-client'
import { toDate } from '@/src/lib/job-time'
import { money } from '@/src/lib/quote-labels'

type Owner = { customerId: string; name: string; startedAt: string; endedAt: string | null; note: string | null }
type Entry = {
  id: string; date: string; mileage: number | null; status: string; complaint: string; diagnosis: string | null
  total: number; customer: { id: string; name: string } | null; mechanic: string | null
  services: { description: string; cost: number }[]; parts: { name: string; quantity: number; total: number }[]
}
type History = {
  owners: Owner[]; entries: Entry[]
  summary: { services: number; lastServiceAt: string | null; lastMileage: number | null }
}
type Customer = { id: string; name: string; phone: string }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignada', in_progress: 'En proceso',
  quality_check: 'Control calidad', completed: 'Completada', cancelled: 'Cancelada',
}
const day = (s: string) => toDate(s).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })
const card = 'bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800'
const input = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

async function fetchHistory(id: string): Promise<History | null> {
  const res = await fetch(`/api/v1/vehicles/${id}/history`)
  return res.ok ? ((await res.json()) as { data: History }).data : null
}

// Historial de servicios del vehículo (sigue al carro aunque cambie de dueño) + cambio de dueño
export function HistoryPanel({ vehicleId, onTransferred }: { vehicleId: string; onTransferred: () => void }) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [history, setHistory] = useState<History | null>(null)
  const [version, setVersion] = useState(0)

  const [transferOpen, setTransferOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [target, setTarget] = useState<Customer | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { void fetchHistory(vehicleId).then(setHistory) }, [vehicleId, version])

  useEffect(() => {
    if (!transferOpen || target) return
    const t = setTimeout(() => {
      void fetch(`/api/v1/customers?search=${encodeURIComponent(search.trim())}&limit=8`)
        .then((r) => r.json() as Promise<{ data: Customer[] }>)
        .then(({ data }) => setResults(data ?? []))
    }, 250)
    return () => clearTimeout(t)
  }, [search, transferOpen, target])

  async function transfer() {
    if (!target) return
    setBusy(true); setError('')
    const res = await fetch(`/api/v1/vehicles/${vehicleId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: target.id, note }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error'); return }
    setTransferOpen(false); setTarget(null); setNote(''); setSearch('')
    setVersion((v) => v + 1)
    onTransferred()
  }

  if (!history) return <div className={`${card} p-5 text-sm text-neutral-400`}>Cargando historial…</div>

  const currentOwner = history.owners.find((o) => !o.endedAt)

  return (
    <div className="space-y-5">
      {/* Dueños */}
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Dueños</h2>
          {isAdmin && !transferOpen && (
            <button onClick={() => setTransferOpen(true)} className="text-sm font-semibold text-blue-600 hover:underline">Cambiar de dueño</button>
          )}
        </div>
        <ol className="space-y-2">
          {[...history.owners].reverse().map((o) => (
            <li key={`${o.customerId}-${o.startedAt}`} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <Link href={`/customers/${o.customerId}`} className="font-semibold text-neutral-900 dark:text-white hover:underline">{o.name}</Link>
                {!o.endedAt && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Actual</span>}
                {o.note && <p className="text-xs text-neutral-500 mt-0.5">“{o.note}”</p>}
              </div>
              <span className="text-xs text-neutral-500 whitespace-nowrap">{day(o.startedAt)} → {o.endedAt ? day(o.endedAt) : 'hoy'}</span>
            </li>
          ))}
        </ol>

        {transferOpen && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              El nuevo dueño verá en su app qué se le hizo al carro (fechas, kilometraje y servicios), pero no el nombre ni los precios
              de {currentOwner?.name ?? 'el dueño anterior'}. {currentOwner?.name ?? 'El dueño anterior'} conserva sus órdenes.
            </p>
            {target ? (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm">
                <span className="font-semibold text-neutral-900 dark:text-white">{target.name} <span className="font-normal text-neutral-500">· {target.phone}</span></span>
                <button onClick={() => setTarget(null)} className="text-blue-600 font-semibold">Cambiar</button>
              </div>
            ) : (
              <div className="space-y-1">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nuevo dueño por nombre…" className={input} />
                <div className="max-h-48 overflow-y-auto">
                  {results.filter((c) => c.id !== currentOwner?.customerId).map((c) => (
                    <button key={c.id} onClick={() => setTarget(c)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      {c.name} <span className="text-neutral-400">· {c.phone}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">¿No está? <Link href="/customers/new" className="text-blue-600 hover:underline">Registrá al cliente</Link> primero.</p>
              </div>
            )}
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo (opcional): venta, traspaso familiar…" className={input} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button disabled={!target || busy} onClick={() => void transfer()} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">
                {busy ? 'Guardando…' : 'Confirmar cambio de dueño'}
              </button>
              <button onClick={() => { setTransferOpen(false); setTarget(null) }} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de servicios */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Historial de servicios</h2>
          <span className="text-xs text-neutral-500">
            {history.summary.services} órdenes
            {history.summary.lastMileage != null && ` · último km ${history.summary.lastMileage.toLocaleString('es-HN')}`}
          </span>
        </div>
        {history.entries.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400 text-center">Este vehículo todavía no tiene órdenes.</p>
        ) : (
          <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {history.entries.map((e) => {
              const formerOwner = e.customer && e.customer.id !== currentOwner?.customerId
              return (
                <li key={e.id} className={`px-5 py-4 space-y-2 ${e.status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/work-orders/${e.id}`} className="font-semibold text-sm text-neutral-900 dark:text-white hover:underline">
                        {day(e.date)}{e.mileage != null && ` · ${e.mileage.toLocaleString('es-HN')} km`}
                      </Link>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {STATUS_LABEL[e.status] ?? e.status}
                        {e.mechanic && ` · ${e.mechanic}`}
                        {formerOwner && ` · dueño anterior: ${e.customer!.name}`}
                      </p>
                    </div>
                    {e.total > 0 && <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300">{money(e.total)}</span>}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{e.complaint}</p>
                  {(e.services.length > 0 || e.parts.length > 0) && (
                    <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-0.5">
                      {e.services.map((s, i) => <li key={`s${i}`}>🔧 {s.description}</li>)}
                      {e.parts.map((p, i) => <li key={`p${i}`}>📦 {p.name}{p.quantity !== 1 ? ` × ${p.quantity}` : ''}</li>)}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
