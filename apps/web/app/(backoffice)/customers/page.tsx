'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  appAccount: { active: boolean; role: string } | null
  address: string | null
  notes: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  // Activos o eliminados (los eliminados conservan su historial y se pueden restaurar)
  const [showDeleted, setShowDeleted] = useState(false)
  const router = useRouter()

  const load = useCallback(async (q: string, deleted: boolean) => {
    setLoading(true)
    const res = await fetch(`/api/v1/customers?search=${encodeURIComponent(q)}&limit=50${deleted ? '&deleted=1' : ''}`)
    const json = await res.json() as { data: Customer[] }
    setCustomers(json.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(search, showDeleted), 300)
    return () => clearTimeout(t)
  }, [search, showDeleted, load])

  // Eliminar = mover a "Eliminados" (no se pierde el historial); Restaurar lo devuelve
  async function handleToggle(c: Customer) {
    const restoring = showDeleted
    if (!restoring && !confirm(`¿Eliminar a ${c.name}?\n\nQueda en "Eliminados" con todo su historial y su cuenta de la app se desactiva. Lo podés restaurar cuando quieras.`)) return
    setDeleting(c.id)
    const res = await fetch(`/api/v1/customers/${c.id}${restoring ? '/restore' : ''}`, { method: restoring ? 'POST' : 'DELETE' })
    setDeleting(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      alert(json.error ?? 'No se pudo completar. Intentá de nuevo.')
      return
    }
    setCustomers((prev) => prev.filter((x) => x.id !== c.id))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Clientes</h1>
          <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 text-xs font-semibold">
            {([false, true] as const).map((d) => (
              <button
                key={String(d)}
                onClick={() => setShowDeleted(d)}
                className={`px-3 py-1 rounded-lg transition-colors ${showDeleted === d ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
              >
                {d ? 'Eliminados' : 'Activos'}
              </button>
            ))}
          </div>
        </div>
        <Link
          href="/customers/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, teléfono o correo…"
        className="w-full max-w-md border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            {search ? 'Sin resultados.' : showDeleted ? 'No hay clientes eliminados.' : 'Aún no hay clientes.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Teléfono</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Correo</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">App</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{c.phone}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-neutral-500 dark:text-neutral-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.appAccount ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.appAccount.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>
                        {c.appAccount.active ? '📱 Con cuenta' : 'Desactivada'}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">Sin cuenta</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => void handleToggle(c)}
                      disabled={deleting === c.id}
                      className={`text-xs disabled:opacity-40 px-2 py-1 rounded-lg transition-colors ${showDeleted ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    >
                      {showDeleted ? 'Restaurar' : 'Eliminar'}
                    </button>
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
