'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Customer = { id: string; name: string }

export default function NewVehiclePage() {
  const router = useRouter()
  const params = useSearchParams()
  const preselectedCustomer = params.get('customerId') ?? ''

  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({ customerId: preselectedCustomer, make: '', model: '', year: new Date().getFullYear().toString(), licensePlate: '', vin: '', color: '', mileage: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/v1/customers?limit=200')
      .then((r) => r.json() as Promise<{ data: Customer[] }>)
      .then(({ data }) => setCustomers(data))
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/v1/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: Number(form.year), mileage: Number(form.mileage) }),
    })
    if (!res.ok) {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al crear vehículo')
      setSaving(false)
      return
    }
    router.push(preselectedCustomer ? `/customers/${preselectedCustomer}` : '/vehicles')
  }

  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Nuevo vehículo</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cliente *</label>
          <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} required className={cls}>
            <option value="">Seleccionar cliente…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Marca *</label>
            <input value={form.make} onChange={(e) => set('make', e.target.value)} required placeholder="Toyota" className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Modelo *</label>
            <input value={form.model} onChange={(e) => set('model', e.target.value)} required placeholder="Corolla" className={cls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Año *</label>
            <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} required min="1900" max="2100" className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Placa *</label>
            <input value={form.licensePlate} onChange={(e) => set('licensePlate', e.target.value)} required placeholder="ABC-123" className={cls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Color</label>
            <input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Blanco" className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Kilometraje</label>
            <input type="number" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} min="0" className={cls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">VIN</label>
          <input value={form.vin} onChange={(e) => set('vin', e.target.value)} placeholder="1HGBH41JXMN109186" className={cls} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Guardando…' : 'Crear vehículo'}
          </button>
          <Link href="/vehicles" className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
