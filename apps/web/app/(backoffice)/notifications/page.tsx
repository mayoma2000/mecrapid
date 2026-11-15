'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRefreshTick } from '@/src/lib/refresh'
import { webUrlFor } from '@/src/lib/notification-links'
import { toDate } from '@/src/lib/job-time'

type AppNotification = { id: string; title: string; body: string; url: string | null; readAt: string | null; createdAt: string }

async function fetchInbox(): Promise<{ items: AppNotification[]; unread: number } | null> {
  const res = await fetch('/api/v1/me/notifications')
  if (!res.ok) return null
  const json = await res.json() as { data: AppNotification[]; meta: { unread: number } }
  return { items: json.data, unread: json.meta.unread }
}

// Bandeja de avisos del taller en el backoffice (los mismos que llegan por push a la app)
export default function NotificationsPage() {
  const tick = useRefreshTick()
  const router = useRouter()
  const [inbox, setInbox] = useState<{ items: AppNotification[]; unread: number } | null>(null)
  const [version, setVersion] = useState(0)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => { void fetchInbox().then(setInbox) }, [tick, version])
  useEffect(() => {
    // El permiso del navegador solo existe del lado del cliente
    queueMicrotask(() => setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
  }, [])

  async function markRead(body: { ids?: string[]; all?: boolean }) {
    await fetch('/api/v1/me/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setVersion((v) => v + 1)
  }

  function open(n: AppNotification) {
    if (!n.readAt) void markRead({ ids: [n.id] })
    const href = webUrlFor(n.url)
    if (href) router.push(href)
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Avisos</h1>
        {(inbox?.unread ?? 0) > 0 && (
          <button onClick={() => void markRead({ all: true })} className="text-sm font-semibold text-blue-600 hover:underline">Marcar todo leído</button>
        )}
      </div>

      {permission === 'default' && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Recibí una notificación en la computadora cuando un cliente aprueba una cotización o pide asistencia.</p>
          <button
            onClick={() => void Notification.requestPermission().then(setPermission)}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
          >
            Activar
          </button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="text-xs text-neutral-500">Las notificaciones del navegador están bloqueadas para este sitio. Podés habilitarlas desde el candado de la barra de direcciones.</p>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {inbox === null ? (
          <p className="p-8 text-center text-sm text-neutral-400">Cargando…</p>
        ) : inbox.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-400">Todavía no hay avisos.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {inbox.items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={`w-full text-left px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${n.readAt ? '' : 'border-l-4 border-blue-500'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm font-semibold ${n.readAt ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>{n.title}</p>
                    <span className="text-xs text-neutral-400 whitespace-nowrap">
                      {toDate(n.createdAt).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{n.body}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
