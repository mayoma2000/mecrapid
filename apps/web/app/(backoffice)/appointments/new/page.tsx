'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Customer = { id: string; name: string }
type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string }

export default function NewAppointmentPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [form, setForm] = useState({ customerId: '', vehicleId: '', scheduledAt: '', serviceType: '', notes: '', duration: '60' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/v1/customers?limit=200')
      .then((r) => r.json() as Promise<{ data: Customer[] }>)
      .then(({ data }) => setCustomers(data))
  }, [])

  useEffect(() => {
    if (!form.customerId) { setVehicles([]); return }
    void fetch(`/api/v1/vehicles?customerId=${form.customerId}&limit=50`)
      .then((r) => r.json() as Promise<{ data: Vehicle[] }>)
      .then(({ data }) => setVehicles(data))
  }, [form.customerId])

  function set(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/v1/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: form.customerId,
        vehicleId: form.vehicleId || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        serviceType: form.serviceType,
        notes: form.notes || null,
        duration: Number(form.duration),
      }),
    })
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error'); setSaving(false); return }
    router.push('/appointments')
  }

  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/appointments" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Nueva cita</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cliente *</label>
          <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} required className={cls}>
            <option value="">Seleccionar cliente…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Vehículo</label>
          <select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)} disabled={!form.customerId} className={cls}>
            <option value="">Sin vehículo especificado</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.licensePlate}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha y hora *</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} required className={cls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo de servicio *</label>
            <input value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} required placeholder="Mantenimiento, diagnóstico…" className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Duración (min)</label>
            <input type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)} min="15" step="15" className={cls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas</label>
          <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Indicaciones adicionales…" className={cls} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Guardando…' : 'Crear cita'}
          </button>
          <Link href="/appointments" className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
