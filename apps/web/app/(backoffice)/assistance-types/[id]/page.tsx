'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditAssistanceTypePage() {
  const router = useRouter()
  const params = useParams()
  const id = params['id'] as string
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch(`/api/v1/assistance-types`)
      .then((r) => r.json() as Promise<{ data: { id: string; name: string; description: string | null; active: boolean }[] }>)
      .then(({ data }) => {
        const item = data.find((t) => t.id === id)
        if (item) { setName(item.name); setDescription(item.description ?? ''); setActive(item.active) }
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/v1/assistance-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null, active }),
    })
    if (res.ok) {
      router.push('/assistance-types')
    } else {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al guardar')
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-neutral-400">Cargando…</div>

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Editar Tipo de Asistencia</h1>
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
        <div className="flex items-center gap-3">
          <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="active" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Activo</label>
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
