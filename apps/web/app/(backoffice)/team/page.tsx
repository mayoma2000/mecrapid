'use client'

import { useEffect, useState } from 'react'
import { toDate } from '@/src/lib/job-time'

type Staff = {
  id: string; name: string; email: string; phone: string | null; role: 'admin' | 'mecanico'
  active: boolean; lastSeenAt: string | null; openOrders: number
}
type Audit = { id: string; action: string; detail: string | null; createdAt: string; actor: string; target: string }
type Data = { staff: Staff[]; audit: Audit[]; me: string }
// Acción pendiente de confirmar con la contraseña propia
type Pending = { title: string; description: string; run: (currentPassword: string) => Promise<string | null> }

const ROLE: Record<Staff['role'], { label: string; cls: string }> = {
  admin:    { label: 'Administrador', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  mecanico: { label: 'Mecánico',      cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
}
const input = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const when = (s: string) => toDate(s).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

async function fetchTeam(): Promise<Data | null> {
  const res = await fetch('/api/v1/staff')
  return res.ok ? ((await res.json()) as { data: Data }).data : null
}

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.ok ? null : ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Error'
}

// Usuarios del taller: administradores (todos con los mismos privilegios) y mecánicos.
// Solo en el backoffice web; las acciones sensibles se confirman con la contraseña propia.
export default function TeamPage() {
  const [data, setData] = useState<Data | null>(null)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'mecanico' as Staff['role'] })
  const [pending, setPending] = useState<Pending | null>(null)
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  // Edición en la misma fila: nombre y teléfono
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '' })

  useEffect(() => { void fetchTeam().then(setData) }, [version])
  const reload = (msg?: string) => { setVersion((v) => v + 1); if (msg) setNotice(msg) }

  // Ejecuta una acción; si es sensible, primero abre el diálogo de contraseña
  async function act(needsPassword: boolean, p: Pending) {
    setError(''); setNotice('')
    if (needsPassword) { setPending(p); setConfirmPw(''); return }
    setBusy(true)
    const err = await p.run('')
    setBusy(false)
    if (err) setError(err)
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    const err = await pending.run(confirmPw)
    setBusy(false)
    if (err) { setError(err); return }
    setPending(null)
  }

  function create() {
    const isAdmin = form.role === 'admin'
    void act(isAdmin, {
      title: 'Crear administrador',
      description: `${form.name} va a tener los mismos permisos que vos.`,
      run: async (currentPassword) => {
        const err = await send('/api/v1/staff', 'POST', { ...form, currentPassword })
        if (!err) {
          setCreating(false)
          setForm({ name: '', email: '', phone: '', password: '', role: 'mecanico' })
          reload(`Cuenta creada: ${form.email} entra con la contraseña que pusiste.`)
        }
        return err
      },
    })
  }

  function changeRole(u: Staff) {
    const to = u.role === 'admin' ? 'mecanico' : 'admin'
    void act(true, {
      title: to === 'admin' ? 'Hacer administrador' : 'Pasar a mecánico',
      description: to === 'admin'
        ? `${u.name} va a tener los mismos permisos que vos. Se cerrará su sesión para aplicar el cambio.`
        : `${u.name} deja de ser administrador. Se cerrará su sesión.`,
      run: async (currentPassword) => {
        const err = await send(`/api/v1/staff/${u.id}`, 'PATCH', { role: to, currentPassword })
        if (!err) reload(`${u.name} ahora es ${to === 'admin' ? 'administrador' : 'mecánico'}.`)
        return err
      },
    })
  }

  function toggleActive(u: Staff) {
    void act(u.role === 'admin', {
      title: u.active ? 'Desactivar cuenta' : 'Reactivar cuenta',
      description: u.active ? `${u.name} no podrá entrar y se cerrarán sus sesiones. Su historial se conserva.` : `${u.name} podrá volver a entrar.`,
      run: async (currentPassword) => {
        const err = await send(`/api/v1/staff/${u.id}`, 'PATCH', { active: !u.active, currentPassword })
        if (!err) reload(u.active ? `${u.name} fue desactivado.` : `${u.name} fue reactivado.`)
        return err
      },
    })
  }

  function resetPassword(u: Staff) {
    const password = window.prompt(`Nueva contraseña para ${u.name} (mínimo 8 caracteres):`)
    if (!password) return
    void act(u.role === 'admin', {
      title: 'Cambiar contraseña',
      description: `Se cambiará la contraseña de ${u.name} y se cerrarán sus sesiones.`,
      run: async (currentPassword) => {
        const err = await send(`/api/v1/staff/${u.id}`, 'PATCH', { password, currentPassword })
        if (!err) reload(`Contraseña de ${u.name} actualizada.`)
        return err
      },
    })
  }

  async function saveEdit(u: Staff) {
    setBusy(true); setError(''); setNotice('')
    const err = await send(`/api/v1/staff/${u.id}`, 'PATCH', { name: editForm.name, phone: editForm.phone })
    setBusy(false)
    if (err) { setError(err); return }
    setEditing(null)
    reload(`Datos de ${editForm.name} actualizados.`)
  }

  const admins = data?.staff.filter((s) => s.role === 'admin' && s.active).length ?? 0

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Usuarios del taller</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Todos los administradores tienen los mismos permisos. Siempre tiene que quedar al menos uno activo.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">+ Nuevo usuario</button>
        )}
      </div>

      {notice && <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">{notice}</p>}
      {error && !pending && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

      {creating && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex gap-2">
            {(['mecanico', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setForm({ ...form, role: r })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${form.role === r ? 'bg-blue-600 text-white border-blue-600' : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'}`}
              >
                {ROLE[r].label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            <input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
            <input placeholder="Correo (usuario) *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            <input placeholder="Contraseña inicial * (mín. 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
          </div>
          {form.role === 'admin' && (
            <p className="text-xs text-neutral-500">Vas a tener que confirmar con tu contraseña: un administrador puede hacer todo, incluido gestionar a otros administradores.</p>
          )}
          <div className="flex gap-3">
            <button disabled={busy || !form.name || !form.email || form.password.length < 8} onClick={create} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">Crear cuenta</button>
            <button onClick={() => setCreating(false)} className="px-5 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        {!data ? (
          <p className="p-8 text-center text-sm text-neutral-400">Cargando…</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nombre</th>
                <th className="text-left px-3 py-3">Rol</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-left px-3 py-3">Último ingreso</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.staff.map((u) => {
                const me = u.id === data.me
                const lastAdmin = u.role === 'admin' && u.active && admins <= 1
                return (
                  <tr key={u.id} className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${u.active ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-3">
                      {editing === u.id ? (
                        <div className="flex flex-col gap-2 max-w-xs">
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nombre" className={input} />
                          <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Teléfono" className={input} />
                          <p className="text-xs text-neutral-500">{u.email}</p>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-neutral-900 dark:text-white">{u.name}{me && <span className="ml-1.5 text-xs font-normal text-neutral-400">(vos)</span>}</p>
                          <p className="text-xs text-neutral-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE[u.role].cls}`}>{ROLE[u.role].label}</span></td>
                    <td className="px-3 py-3 text-xs">
                      {u.active ? 'Activo' : 'Inactivo'}
                      {u.role === 'mecanico' && u.openOrders > 0 && <span className="text-neutral-400"> · {u.openOrders} órdenes abiertas</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-500">{u.lastSeenAt ? when(u.lastSeenAt) : 'Nunca'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap space-x-3 text-xs font-semibold">
                      {editing === u.id ? (
                        <>
                          <button disabled={busy || editForm.name.trim().length < 3} onClick={() => void saveEdit(u)} className="text-blue-600 hover:underline disabled:opacity-40">Guardar</button>
                          <button onClick={() => setEditing(null)} className="text-neutral-500 hover:underline">Cancelar</button>
                        </>
                      ) : (
                      <>
                      <button onClick={() => { setEditing(u.id); setEditForm({ name: u.name, phone: u.phone ?? '' }) }} className="text-blue-600 hover:underline">Editar</button>
                      {!me && (
                        <button
                          onClick={() => changeRole(u)}
                          disabled={lastAdmin}
                          title={lastAdmin ? 'Es el único administrador activo' : undefined}
                          className="text-blue-600 hover:underline disabled:text-neutral-300 disabled:no-underline"
                        >
                          {u.role === 'admin' ? 'Pasar a mecánico' : 'Hacer admin'}
                        </button>
                      )}
                      <button onClick={() => resetPassword(u)} className="text-blue-600 hover:underline">Contraseña</button>
                      {!me && (
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={lastAdmin}
                          title={lastAdmin ? 'Es el único administrador activo' : undefined}
                          className={`hover:underline disabled:text-neutral-300 disabled:no-underline ${u.active ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                      </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.audit.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Registro de cambios</h2>
          <ul className="space-y-2">
            {data.audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-700 dark:text-neutral-300"><span className="font-semibold">{a.actor}</span> {a.detail}</span>
                <span className="text-xs text-neutral-400 whitespace-nowrap">{when(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmación con la contraseña propia */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">{pending.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{pending.description}</p>
            </div>
            <input
              type="password"
              autoFocus
              placeholder="Tu contraseña"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && confirmPw) void confirm() }}
              className={input}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setPending(null); setError('') }} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">Cancelar</button>
              <button disabled={!confirmPw || busy} onClick={() => void confirm()} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">
                {busy ? 'Confirmando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
