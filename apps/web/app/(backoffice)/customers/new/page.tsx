'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/v1/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al crear cliente')
      setSaving(false)
      return
    }
    router.push('/customers')
  }

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Nuevo cliente</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <Field label="Nombre *" value={form.name} onChange={(v) => set('name', v)} required placeholder="Juan Pérez" />
        <Field label="Teléfono *" value={form.phone} onChange={(v) => set('phone', v)} required placeholder="+504 9999-9999" />
        <Field label="Correo" value={form.email} onChange={(v) => set('email', v)} type="email" placeholder="juan@correo.com" />
        <Field label="Dirección" value={form.address} onChange={(v) => set('address', v)} placeholder="Col. Kennedy, Tegucigalpa" />
        <Field label="Notas" value={form.notes} onChange={(v) => set('notes', v)} placeholder="Cliente frecuente…" textarea />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando…' : 'Crear cliente'}
          </button>
          <Link href="/customers" className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, value, onChange, required, placeholder, type = 'text', textarea,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; placeholder?: string; type?: string; textarea?: boolean
}) {
  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}
