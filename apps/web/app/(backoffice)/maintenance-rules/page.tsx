'use client'

import { useEffect, useState } from 'react'
import { everyLabel } from '@/src/lib/maintenance-labels'

type Rule = { id: string; name: string; keywords: string; intervalKm: number | null; intervalMonths: number | null; active: boolean }
type Form = { name: string; keywords: string; intervalKm: string; intervalMonths: string }

const EMPTY: Form = { name: '', keywords: '', intervalKm: '', intervalMonths: '' }
const input = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

async function fetchRules(): Promise<Rule[]> {
  const res = await fetch('/api/v1/maintenance-rules')
  return res.ok ? ((await res.json()) as { data: Rule[] }).data : []
}

// Catálogo de mantenimientos preventivos que la app le recuerda a cada cliente
export default function MaintenanceRulesPage() {
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void fetchRules().then(setRules) }, [version])

  function start(rule?: Rule) {
    setError('')
    setEditing(rule?.id ?? 'new')
    setForm(rule
      ? { name: rule.name, keywords: rule.keywords, intervalKm: rule.intervalKm?.toString() ?? '', intervalMonths: rule.intervalMonths?.toString() ?? '' }
      : EMPTY)
  }

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setError('')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    setBusy(false)
    if (!res.ok) { setError((await res.json().catch(() => ({})) as { error?: string }).error ?? 'Error'); return false }
    setVersion((v) => v + 1)
    return true
  }

  async function save() {
    const ok = editing === 'new'
      ? await call('/api/v1/maintenance-rules', 'POST', form)
      : await call(`/api/v1/maintenance-rules/${editing}`, 'PATCH', form)
    if (ok) setEditing(null)
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mantenimientos</h1>
          <p className="text-sm text-neutral-500 mt-1">La app le avisa a cada cliente cuando a su carro le toca, por kilometraje o por tiempo (lo que llegue primero).</p>
        </div>
        {editing === null && (
          <button onClick={() => start()} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shrink-0">+ Nuevo</button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

      {editing !== null && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cambio de aceite" className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Palabras clave</label>
              <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="aceite" className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cada cuántos km</label>
              <input type="number" min="1" value={form.intervalKm} onChange={(e) => setForm({ ...form, intervalKm: e.target.value })} placeholder="5000" className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cada cuántos meses</label>
              <input type="number" min="1" value={form.intervalMonths} onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })} placeholder="3" className={input} />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Las palabras clave (separadas por coma) sirven para reconocer cuándo se hizo: si un servicio o repuesto autorizado
            de una orden completada las contiene, cuenta como hecho ese día y con el kilometraje de ingreso de la orden.
          </p>
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => void save()} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">Guardar</button>
            <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {rules === null ? (
          <p className="p-6 text-sm text-neutral-400 text-center">Cargando…</p>
        ) : rules.length === 0 ? (
          <p className="p-6 text-sm text-neutral-400 text-center">Sin mantenimientos configurados.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rules.map((r) => (
              <li key={r.id} className={`px-5 py-3.5 flex items-center justify-between gap-3 ${r.active ? '' : 'opacity-50'}`}>
                <div>
                  <p className="font-semibold text-sm text-neutral-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Cada {everyLabel(r.intervalKm, r.intervalMonths)} · detecta: {r.keywords.split(',').join(', ')}</p>
                </div>
                <div className="flex gap-3 text-xs font-semibold whitespace-nowrap">
                  <button onClick={() => start(r)} className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => void call(`/api/v1/maintenance-rules/${r.id}`, 'PATCH', { active: !r.active })} className={r.active ? 'text-neutral-500 hover:underline' : 'text-green-600 hover:underline'}>
                    {r.active ? 'Pausar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
