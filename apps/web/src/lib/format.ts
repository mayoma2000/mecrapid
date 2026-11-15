export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`
  if (m > 0) return `${m} min`
  return `${s % 60} s`
}

// Segundos trabajados en vivo: lo acumulado por el servidor + lo que corre desde runningSince
export function liveSeconds(
  job: { workedSeconds: number; runningSince: string | null },
  serverTime: string,
  now: number,
): number {
  if (!job.runningSince) return job.workedSeconds
  return job.workedSeconds + Math.max(0, (now - new Date(serverTime).getTime()) / 1000)
}
