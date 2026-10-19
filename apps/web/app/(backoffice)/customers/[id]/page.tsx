'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string }
type Customer = { id: string; name: string; phone: string; email: string | null; address: string | null; notes: string | null; vehicles: Vehicle[] }

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void fetch(`/api/v1/customers/${id}`)
      .then((r) => r.json() as Promise<{ data: Customer }>)
      .then(({ data }) => {
        setCustomer(data)
        setForm({ name: data.name, phone: data.phone, email: data.email ?? '', address: data.address ?? '', notes: data.notes ?? '' })
      })
  }, [id])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/v1/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al guardar')
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${customer?.name}?`)) return
    await fetch(`/api/v1/customers/${id}`, { method: 'DELETE' })
    router.push('/customers')
  }

  if (!customer) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{customer.name}</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <Field label="Nombre *" value={form.name} onChange={(v) => set('name', v)} required />
        <Field label="Teléfono *" value={form.phone} onChange={(v) => set('phone', v)} required />
        <Field label="Correo" value={form.email} onChange={(v) => set('email', v)} type="email" />
        <Field label="Dirección" value={form.address} onChange={(v) => set('address', v)} />
        <Field label="Notas" value={form.notes} onChange={(v) => set('notes', v)} textarea />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Guardado.</p>}

        <div className="flex items-center justify-between pt-1">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => void handleDelete()} className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Eliminar cliente
          </button>
        </div>
      </form>

      {/* Vehicles section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-700 dark:text-neutral-300">Vehículos</h2>
          <Link href={`/vehicles/new?customerId=${id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Agregar</Link>
        </div>
        {customer.vehicles.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin vehículos registrados.</p>
        ) : (
          <div className="space-y-2">
            {customer.vehicles.map((v) => (
              <Link key={v.id} href={`/vehicles/${v.id}`} className="flex items-center justify-between p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">{v.year} {v.make} {v.model}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{v.licensePlate}</p>
                </div>
                <span className="text-neutral-400">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required, type = 'text', textarea }: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; type?: string; textarea?: boolean
}) {
  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className={cls} />
      )}
    </div>
  )
}
