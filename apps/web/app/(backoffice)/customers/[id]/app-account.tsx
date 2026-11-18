'use client'

import { useState } from 'react'
import { useSession } from '@/src/lib/auth-client'
import { toDate } from '@/src/lib/job-time'

export type AppAccount = { id: string; role: string; active: boolean; createdAt: string; lastSeenAt: string | null }

const when = (s: string) => toDate(s).toLocaleString('es-HN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// La cuenta con la que el cliente entra a la app (vinculada por correo a esta ficha)
export function AppAccountCard({ customerId, email, account, onChange }: {
  customerId: string
  email: string | null
  account: AppAccount | null
  onChange: () => void
}) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function update(body: { active?: boolean; password?: string }, done: string) {
    setBusy(true); setError(''); setMsg('')
    const res = await fetch(`/api/v1/customers/${customerId}/account`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setBusy(false)
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Error'); return }
    setMsg(done)
    onChange()
  }

  function resetPassword() {
    const password = window.prompt('Nueva contraseña para la cuenta del cliente (mínimo 8 caracteres):')
    if (password) void update({ password }, 'Contraseña cambiada. Se cerraron sus sesiones abiertas.')
  }

  const staff = account && (account.role === 'admin' || account.role === 'mecanico')

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-300">Cuenta en la app</h2>
        {account ? (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${account.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>
            {account.active ? 'Activa' : 'Desactivada'}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 dark:bg-neutral-800">Sin cuenta</span>
        )}
      </div>

      {!account ? (
        <p className="text-sm text-neutral-500">
          {email
            ? <>Todavía no se registró. Cuando cree su cuenta en la app con <b>{email}</b>, va a ver aquí sus vehículos, órdenes y cotizaciones.</>
            : 'Esta ficha no tiene correo: agregáselo para que, al registrarse en la app con ese correo, vea su historial.'}
        </p>
      ) : staff ? (
        <p className="text-sm text-neutral-500">Ese correo es de una cuenta del personal del taller; se gestiona en Usuarios del taller.</p>
      ) : (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Entra con <b>{email}</b> · creada el {when(account.createdAt)} · último ingreso: {account.lastSeenAt ? when(account.lastSeenAt) : 'nunca'}
          </p>
          {isAdmin && (
            <div className="flex gap-4 text-sm font-semibold">
              <button disabled={busy} onClick={resetPassword} className="text-blue-600 hover:underline disabled:opacity-50">Cambiar contraseña</button>
              <button
                disabled={busy}
                onClick={() => {
                  if (!account.active || window.confirm('¿Desactivar la cuenta? El cliente no podrá entrar a la app; su historial se conserva.')) {
                    void update({ active: !account.active }, account.active ? 'Cuenta desactivada.' : 'Cuenta reactivada.')
                  }
                }}
                className={`hover:underline disabled:opacity-50 ${account.active ? 'text-red-600' : 'text-green-600'}`}
              >
                {account.active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              </button>
            </div>
          )}
        </>
      )}
      {msg && <p className="text-sm text-green-700 dark:text-green-400">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
