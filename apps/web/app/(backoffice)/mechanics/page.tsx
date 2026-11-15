'use client'

import { useEffect, useState } from 'react'

type Mechanic = { id: string; name: string; email: string; phone: string | null; active: boolean }

const input = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

async function fetchMechanics(): Promise<Mechanic[]> {
  const res = await fetch('/api/v1/mechanics?all=1')
  return (await res.json() as { data?: Mechanic[] }).data ?? []
}

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[] | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [version, setVersion] = useState(0)
  const load = () => setVersion((v) => v + 1)

  useEffect(() => { void fetchMechanics().then(setMechanics) }, [version])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setNotice('')
    const res = await fetch('/api/v1/mechanics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error'); return }
    setNotice(`Cuenta creada. ${form.name} entra a la app con ${form.email} y la contraseña que pusiste.`)
    setForm({ name: '', email: '', phone: '', password: '' })
    setShowForm(false)
    void load()
  }

  async function update(id: string, body: Partial<{ active: boolean; password: string }>) {
    setError(''); setNotice('')
    const res = await fetch(`/api/v1/mechanics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error'); return }
    if (body.password) setNotice('Contraseña actualizada.')
    void load()
  }

  function resetPassword(m: Mechanic) {
    const password = window.prompt(`Nueva contraseña para ${m.name} (mínimo 8 caracteres):`)
    if (password) void update(m.id, { password })
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mecánicos</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
            + Nuevo mecánico
          </button>
        )}
      </div>

      {notice && <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">{notice}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9999-9999" className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Correo (usuario) *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Contraseña inicial *</label>
              <input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" className={input} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {mechanics === null ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : mechanics.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin mecánicos registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contacto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {mechanics.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">{m.name}</td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    <p>{m.email}</p>
                    {m.phone && <p className="text-xs">{m.phone}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>
                      {m.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => resetPassword(m)} className="text-xs font-semibold text-blue-600 hover:underline">Contraseña</button>
                    <button
                      onClick={() => void update(m.id, { active: !m.active })}
                      className={`text-xs font-semibold hover:underline ${m.active ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {m.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        Desactivar no borra su historial: el mecánico ya no puede entrar y deja de aparecer para asignarle órdenes.
      </p>
    </div>
  )
}
