import { useEffect, useState } from 'react'
import { safeDate } from './date'

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`
  if (m > 0) return `${m} min`
  return `${s % 60} s`
}

// Segundos trabajados en vivo: lo acumulado por el servidor + lo que corre desde que se pidió
export function liveSeconds(
  job: { workedSeconds: number; runningSince: string | null },
  fetchedAt: number,
  now: number,
): number {
  if (!job.runningSince) return job.workedSeconds
  return job.workedSeconds + Math.max(0, (now - fetchedAt) / 1000)
}

// Reloj que se actualiza cada `ms` para mostrar cronómetros en vivo
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function formatShortDateTime(iso: string): string {
  return safeDate(iso).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
