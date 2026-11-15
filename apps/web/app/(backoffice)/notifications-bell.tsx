'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRefreshTick } from '@/src/lib/refresh'
import { webUrlFor } from '@/src/lib/notification-links'

type AppNotification = { id: string; title: string; body: string; url: string | null; readAt: string | null; createdAt: string }

async function fetchInbox(): Promise<{ items: AppNotification[]; unread: number } | null> {
  const res = await fetch('/api/v1/me/notifications')
  if (!res.ok) return null
  const json = await res.json() as { data: AppNotification[]; meta: { unread: number } }
  return { items: json.data, unread: json.meta.unread }
}

// Campana del menú: cuántos avisos sin leer hay y, si el navegador lo permite,
// una notificación del sistema cuando llega uno nuevo con el backoffice abierto
export function NotificationsBell({ onNavigate }: { onNavigate?: () => void }) {
  const tick = useRefreshTick()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    void fetchInbox().then((inbox) => {
      if (!inbox) return
      setUnread(inbox.unread)
      const fresh = inbox.items.filter((n) => !n.readAt)
      // La primera carga solo registra lo que ya había; después se avisa lo nuevo
      if (seen.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        for (const n of fresh.filter((x) => !seen.current!.has(x.id))) {
          const notice = new Notification(n.title, { body: n.body, tag: n.id })
          const href = webUrlFor(n.url)
          notice.onclick = () => { window.focus(); router.push(href ?? '/notifications') }
        }
      }
      seen.current = new Set(fresh.map((n) => n.id))
    })
  }, [tick, router])

  return (
    <Link
      href="/notifications"
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      <span>🔔</span>
      <span className="flex-1">Avisos</span>
      {unread > 0 && (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center tabular-nums">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
