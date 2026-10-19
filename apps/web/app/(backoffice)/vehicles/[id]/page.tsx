'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string; vin: string | null; color: string | null; mileage: number; customer: { id: string; name: string } }

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState({ make: '', model: '', year: '', licensePlate: '', vin: '', color: '', mileage: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void fetch(`/api/v1/vehicles/${id}`)
      .then((r) => r.json() as Promise<{ data: Vehicle }>)
      .then(({ data }) => {
        setVehicle(data)
        setForm({ make: data.make, model: data.model, year: String(data.year), licensePlate: data.licensePlate, vin: data.vin ?? '', color: data.color ?? '', mileage: String(data.mileage) })
      })
  }, [id])

  function set(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })); setSuccess(false) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch(`/api/v1/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: Number(form.year), mileage: Number(form.mileage) }),
    })
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error'); }
    else { setSuccess(true) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este vehículo?')) return
    await fetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' })
    router.push('/vehicles')
  }

  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (!vehicle) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Cliente: <Link href={`/customers/${vehicle.customer.id}`} className="text-blue-600 hover:underline">{vehicle.customer.name}</Link>
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Marca</label>
            <input value={form.make} onChange={(e) => set('make', e.target.value)} className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Modelo</label>
            <input value={form.model} onChange={(e) => set('model', e.target.value)} className={cls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Año</label>
            <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Placa</label>
            <input value={form.licensePlate} onChange={(e) => set('licensePlate', e.target.value)} className={cls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Color</label>
            <input value={form.color} onChange={(e) => set('color', e.target.value)} className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Kilometraje</label>
            <input type="number" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} className={cls} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">VIN</label>
          <input value={form.vin} onChange={(e) => set('vin', e.target.value)} className={cls} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Guardado.</p>}

        <div className="flex items-center justify-between pt-1">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => void handleDelete()} className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Eliminar vehículo
          </button>
        </div>
      </form>
    </div>
  )
}
