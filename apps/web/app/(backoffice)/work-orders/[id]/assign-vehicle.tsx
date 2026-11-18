'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string }

async function fetchVehicles(customerId: string): Promise<Vehicle[]> {
  const res = await fetch(`/api/v1/vehicles?customerId=${customerId}&limit=50`)
  return res.ok ? ((await res.json()) as { data: Vehicle[] }).data : []
}

// Orden sin vehículo (p. ej. nació de un SOS): hay que asignarlo antes de terminarla
export function AssignVehicle({ orderId, customerId, onAssigned }: { orderId: string; customerId: string; onAssigned: () => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  const [vehicleId, setVehicleId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { void fetchVehicles(customerId).then(setVehicles) }, [customerId])

  async function assign() {
    setSaving(true); setError('')
    const res = await fetch(`/api/v1/work-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId }),
    })
    setSaving(false)
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Error'); return }
    onAssigned()
  }

  return (
    <div className="rounded-2xl border-2 border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-5 space-y-3">
      <div>
        <p className="font-semibold text-neutral-900 dark:text-white">⚠️ Esta orden no tiene vehículo</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Asignalo para poder terminarla: el historial, el kilometraje y los recordatorios dependen del carro.</p>
      </div>
      {vehicles === null ? (
        <p className="text-sm text-neutral-400">Cargando vehículos del cliente…</p>
      ) : (
        <div className="flex gap-2 flex-wrap items-center">
          {vehicles.length > 0 && (
            <>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white">
                <option value="">Elegí un vehículo…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.licensePlate}</option>)}
              </select>
              <button disabled={!vehicleId || saving} onClick={() => void assign()} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Asignando…' : 'Asignar'}
              </button>
            </>
          )}
          <Link href={`/vehicles/new?customerId=${customerId}`} className="text-sm font-semibold text-blue-600 hover:underline">
            {vehicles.length > 0 ? 'o registrar otro' : '+ Registrar vehículo del cliente'}
          </Link>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
