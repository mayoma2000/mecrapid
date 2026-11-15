'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/src/lib/auth-client'
import { formatDuration, liveSeconds } from '@/src/lib/format'
import { useNow } from '@/src/lib/use-now'

type Job = {
  id: string
  status: string
  complaint: string
  createdAt: string
  mechanicId: string | null
  customer: { id: string; name: string } | null
  vehicle: { make: string; model: string; year: number; licensePlate: string } | null
  workedSeconds: number
  runningSince: string | null
}
type Column = { mechanic: { id: string; name: string; phone: string | null; active: boolean }; working: boolean; orders: Job[] }
type Board = { columns: Column[]; unassigned: Job[]; serverTime: string }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignada', in_progress: 'En proceso', quality_check: 'Control calidad',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  quality_check: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

async function fetchBoard(): Promise<Board | null> {
  const res = await fetch('/api/v1/job-board')
  if (!res.ok) return null
  return (await res.json() as { data: Board }).data
}

export default function JobBoardPage() {
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState('')
  const now = useNow()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  // El tablero se refresca solo cada 15 s (los cronómetros corren en vivo entre medio)
  useEffect(() => {
    const apply = (data: Board | null) => {
      if (data) { setBoard(data); setError('') } else setError('No se pudo cargar el tablero')
    }
    void fetchBoard().then(apply)
    const t = setInterval(() => void fetchBoard().then(apply), 15_000)
    return () => clearInterval(t)
  }, [version])

  async function assign(orderId: string, mechanicId: string) {
    await fetch(`/api/v1/work-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanicId }),
    })
    reload()
  }

  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>
  if (!board) return <div className="p-6 text-sm text-neutral-400">Cargando…</div>

  const working = board.columns.filter((c) => c.working).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Trabajo en taller</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {working} de {board.columns.length} mecánicos trabajando · {board.unassigned.length} sin asignar
          </p>
        </div>
        {isAdmin && (
          <Link href="/team" className="text-sm font-semibold text-blue-600 hover:underline">Gestionar mecánicos →</Link>
        )}
      </div>

      {board.columns.length === 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-sm text-neutral-500">
          Todavía no hay mecánicos registrados.{' '}
          {isAdmin && <Link href="/team" className="text-blue-600 font-semibold hover:underline">Agregar el primero</Link>}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2 items-start">
        {board.unassigned.length > 0 && (
          <BoardColumn title="Sin asignar" subtitle={`${board.unassigned.length} órdenes`} tone="muted">
            {board.unassigned.map((job) => (
              <JobCard key={job.id} job={job} seconds={liveSeconds(job, board.serverTime, now)}>
                {isAdmin && board.columns.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && void assign(job.id, e.target.value)}
                    className="mt-3 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1.5 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="">Asignar a…</option>
                    {board.columns.filter((c) => c.mechanic.active).map((c) => (
                      <option key={c.mechanic.id} value={c.mechanic.id}>{c.mechanic.name}</option>
                    ))}
                  </select>
                )}
              </JobCard>
            ))}
          </BoardColumn>
        )}

        {board.columns.map((col) => (
          <BoardColumn
            key={col.mechanic.id}
            title={col.mechanic.name}
            subtitle={col.working ? 'Trabajando ahora' : col.orders.length ? 'En pausa' : 'Libre'}
            tone={col.working ? 'active' : 'idle'}
          >
            {col.orders.length === 0 ? (
              <p className="text-xs text-neutral-400 px-1 py-4 text-center">Sin órdenes abiertas</p>
            ) : (
              col.orders.map((job) => (
                <JobCard key={job.id} job={job} seconds={liveSeconds(job, board.serverTime, now)} />
              ))
            )}
          </BoardColumn>
        ))}
      </div>
    </div>
  )
}

function BoardColumn({ title, subtitle, tone, children }: {
  title: string; subtitle: string; tone: 'active' | 'idle' | 'muted'; children: React.ReactNode
}) {
  const dot = tone === 'active' ? 'bg-green-500 animate-pulse' : tone === 'idle' ? 'bg-neutral-300 dark:bg-neutral-600' : 'bg-orange-400'
  return (
    <div className="w-72 flex-shrink-0 bg-neutral-100/70 dark:bg-neutral-900/60 rounded-2xl p-3 space-y-3">
      <div className="px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h2 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{title}</h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 ml-4">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function JobCard({ job, seconds, children }: { job: Job; seconds: number; children?: React.ReactNode }) {
  const running = !!job.runningSince
  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-xl border p-3 hover:shadow-md transition-shadow ${running ? 'border-green-300 dark:border-green-800' : 'border-neutral-200 dark:border-neutral-800'}`}>
      <Link href={`/work-orders/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
            {job.vehicle ? `${job.vehicle.make} ${job.vehicle.model}` : 'Sin vehículo'}
          </p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${STATUS_COLOR[job.status] ?? ''}`}>
            {STATUS_LABEL[job.status] ?? job.status}
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
          {job.vehicle?.licensePlate ? `${job.vehicle.licensePlate} · ` : ''}{job.customer?.name ?? '—'}
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2">{job.complaint}</p>
        <div className={`mt-2 text-xs font-mono font-semibold ${running ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}>
          {running ? '● ' : '⏱ '}{formatDuration(seconds)}
        </div>
      </Link>
      {children}
    </div>
  )
}
