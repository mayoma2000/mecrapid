'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ServiceType = { id: string; name: string; description: string | null; durationMinutes: number; active: boolean }

export default function ServiceTypesPage() {
  const [types, setTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/v1/service-types')
    const json = await res.json() as { data: ServiceType[] }
    setTypes(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/v1/service-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    void load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    await fetch(`/api/v1/service-types/${id}`, { method: 'DELETE' })
    void load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Servicios Ofrecidos</h1>
        <Link href="/service-types/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuevo
        </Link>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin servicios. Crea el primero para que los clientes puedan agendar citas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Servicio</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Descripción</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Duración</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">{t.name}</td>
                  <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400">{t.description ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center text-neutral-600 dark:text-neutral-400">{t.durationMinutes} min</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => void handleToggle(t.id, t.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${t.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}
                    >
                      {t.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/service-types/${t.id}`} className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Editar</Link>
                      <button onClick={() => void handleDelete(t.id)} className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
