// Tiempo trabajado en una orden a partir de sus tramos (WorkOrderTimeLog).
type Log = { startedAt: string; endedAt: string | null; mechanicId: string }

// La DB devuelve timestamptz como "2026-11-17 17:00:00+00"; se normaliza a ISO
export function toDate(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

export function summarizeLogs(logs: Log[], now = Date.now()) {
  let workedSeconds = 0
  let running: Log | null = null
  for (const log of logs) {
    const start = toDate(log.startedAt).getTime()
    const end = log.endedAt ? toDate(log.endedAt).getTime() : now
    workedSeconds += Math.max(0, Math.round((end - start) / 1000))
    if (!log.endedAt) running = log
  }
  return {
    workedSeconds,
    runningSince: running?.startedAt ?? null,
    runningMechanicId: running?.mechanicId ?? null,
  }
}

// El kilometraje de ingreso de una orden actualiza el del vehículo (nunca lo baja)
export async function bumpVehicleMileage(
  db: typeof import('@/src/prisma/db').db,
  vehicleId: string | null | undefined,
  mileage: number | null | undefined,
) {
  if (!vehicleId || mileage == null || !Number.isFinite(mileage)) return
  const vehicle = await db.orm.public.Vehicle.first({ id: vehicleId })
  if (vehicle && mileage > vehicle.mileage) {
    await db.orm.public.Vehicle.where({ id: vehicleId }).update({ mileage })
  }
}
