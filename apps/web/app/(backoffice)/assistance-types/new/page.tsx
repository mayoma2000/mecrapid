'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAssistanceTypePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/v1/assistance-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null }),
    })
    if (res.ok) {
      router.push('/assistance-types')
    } else {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Nuevo Tipo de Asistencia</h1>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Nombre *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
