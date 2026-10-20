'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type ServiceType = { id: string; name: string; description: string | null; durationMinutes: number; active: boolean }

export default function EditServiceTypePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch(`/api/v1/service-types/${id}`)
      .then((r) => r.json() as Promise<{ data: ServiceType }>)
      .then(({ data }) => {
        setName(data.name)
        setDescription(data.description ?? '')
        setDurationMinutes(String(data.durationMinutes))
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/v1/service-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null, durationMinutes: Number(durationMinutes) }),
    })
    if (res.ok) {
      router.push('/service-types')
    } else {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al guardar')
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Editar Servicio</h1>
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
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Duración estimada (minutos)</label>
          <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} min={15} max={480} step={15}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
