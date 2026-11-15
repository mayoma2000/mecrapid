'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/src/lib/auth-client'
import { formatDuration, liveSeconds } from '@/src/lib/format'
import { useNow } from '@/src/lib/use-now'

type Mechanic = { id: string; name: string }
type TimeLog = { id: string; mechanicId: string; startedAt: string; endedAt: string | null }

export type WorkInfo = {
  id: string
  status: string
  mechanicId: string | null
  mechanic?: { name: string } | null
  mileageIn: number | null
  workedSeconds: number
  runningSince: string | null
  timeLogs: TimeLog[]
}

const CLOSED = ['completed', 'cancelled']

// Mecánico asignado, kilometraje de ingreso y cronómetro de la orden
export function WorkPanel({ order, fetchedAt, onChange }: {
  order: WorkInfo
  fetchedAt: string
  onChange: () => void
}) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = role === 'admin'
  const now = useNow()

  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [mileage, setMileage] = useState(order.mileageIn != null ? String(order.mileageIn) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/v1/mechanics')
      .then((r) => r.json() as Promise<{ data: Mechanic[] }>)
      .then(({ data }) => setMechanics(data ?? []))
  }, [])

  async function call(url: string, body: unknown, method = 'PATCH') {
    setBusy(true); setError('')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) setError((await res.json().catch(() => ({})) as { error?: string }).error ?? 'Error')
    setBusy(false)
    onChange()
  }

  const closed = CLOSED.includes(order.status)
  const running = !!order.runningSince
  const seconds = liveSeconds(order, fetchedAt, now)
  const nameOf = (id: string) =>
    mechanics.find((m) => m.id === id)?.name ?? (id === order.mechanicId ? order.mechanic?.name : undefined) ?? 'Mecánico'
  const canOperate = isAdmin || (role === 'mecanico' && (!order.mechanicId || order.mechanicId === session?.user.id))
  const cls = 'border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Trabajo en taller</h2>
        <span className={`text-sm font-mono font-semibold ${running ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'}`}>
          {running && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2 align-middle" />}
          {formatDuration(seconds)}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Mecánico</label>
          {isAdmin ? (
            <select
              value={order.mechanicId ?? ''}
              disabled={busy || closed}
              onChange={(e) => void call(`/api/v1/work-orders/${order.id}`, { mechanicId: e.target.value || null })}
              className={`w-full ${cls}`}
            >
              <option value="">Sin asignar</option>
              {mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          ) : (
            <p className="text-sm text-neutral-900 dark:text-white py-2">
              {order.mechanicId ? nameOf(order.mechanicId) : 'Sin asignar'}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Kilometraje de ingreso</label>
          <div className="flex gap-2">
            <input
              type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)}
              placeholder="Ej. 85000" className={`flex-1 min-w-0 ${cls}`}
            />
            <button
              disabled={busy || mileage === (order.mileageIn != null ? String(order.mileageIn) : '')}
              onClick={() => void call(`/api/v1/work-orders/${order.id}`, { mileageIn: mileage === '' ? null : Number(mileage) })}
              className="px-3 py-2 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {!closed && canOperate && (
        <div className="flex gap-2 flex-wrap">
          {!running ? (
            <button
              disabled={busy || (!order.mechanicId && role !== 'mecanico')}
              onClick={() => void call(`/api/v1/work-orders/${order.id}/timer`, { action: 'start' }, 'POST')}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
              title={!order.mechanicId && role !== 'mecanico' ? 'Asigná un mecánico primero' : undefined}
            >
              ▶ {order.workedSeconds > 0 ? 'Reanudar' : 'Iniciar trabajo'}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => void call(`/api/v1/work-orders/${order.id}/timer`, { action: 'pause' }, 'POST')}
              className="px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-xl hover:bg-yellow-600 disabled:opacity-50"
            >
              ⏸ Pausar
            </button>
          )}
          {order.status === 'in_progress' && (
            <button
              disabled={busy}
              onClick={() => void call(`/api/v1/work-orders/${order.id}/timer`, { action: 'finish' }, 'POST')}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50"
            >
              ✓ Terminar → Control de calidad
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {order.timeLogs.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Registro de tiempo</p>
          {order.timeLogs.map((l) => {
            const start = new Date(l.startedAt.replace(' ', 'T'))
            const end = l.endedAt ? new Date(l.endedAt.replace(' ', 'T')) : null
            const secs = ((end?.getTime() ?? now) - start.getTime()) / 1000
            return (
              <div key={l.id} className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                <span>
                  {nameOf(l.mechanicId)} · {start.toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {end ? end.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-medium">en curso</span>}
                </span>
                <span className="font-mono">{formatDuration(secs)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
