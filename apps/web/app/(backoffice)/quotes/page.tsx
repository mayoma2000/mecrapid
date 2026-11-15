'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { QUOTE_STATUS, money } from '@/src/lib/quote-labels'
import { toDate } from '@/src/lib/job-time'
import { waMessages, whatsappLink } from '@/src/lib/whatsapp'
import { useRefreshTick } from '@/src/lib/refresh'

type Row = {
  id: string; status: string; workOrderId: string; createdAt: string; sentAt: string | null; respondedAt: string | null
  respondedVia: string | null; itemsCount: number; total: number; approvedTotal: number; waitingDays: number | null
  customer: { id: string; name: string; phone: string } | null
  vehicle: { make: string; model: string; licensePlate: string } | null
}
type Page = { data: Row[]; meta: { total: number; counts: Record<string, number> } }

const TABS = [
  { key: 'sent', label: 'Esperando cliente' },
  { key: 'draft', label: 'Borradores' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'partially_approved', label: 'En parte' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: '', label: 'Todas' },
]
const PAGE = 50
const day = (s: string) => toDate(s).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })

async function fetchPage(status: string, offset: number): Promise<Page | null> {
  const qs = new URLSearchParams({ limit: String(PAGE), offset: String(offset), ...(status ? { status } : {}) })
  const res = await fetch(`/api/v1/quotes?${qs}`)
  return res.ok ? ((await res.json()) as Page) : null
}

// Seguimiento de todas las cotizaciones del taller. Se crean desde cada orden.
export default function QuotesPage() {
  const [tab, setTab] = useState('sent')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [meta, setMeta] = useState<Page['meta'] | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const tick = useRefreshTick()

  useEffect(() => {
    void fetchPage(tab, 0).then((p) => { setRows(p?.data ?? []); setMeta(p?.meta ?? null) })
  }, [tab, tick])

  async function loadMore() {
    setLoadingMore(true)
    const p = await fetchPage(tab, rows?.length ?? 0)
    setRows((prev) => [...(prev ?? []), ...(p?.data ?? [])])
    setLoadingMore(false)
  }

  const total = meta ? Object.values(meta.counts).reduce((s, n) => s + n, 0) : 0

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Cotizaciones</h1>
        <p className="text-sm text-neutral-500 mt-1">Para crear una, abrí la orden de trabajo → Cotizaciones → Nueva.</p>
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((t) => {
          const count = t.key ? meta?.counts[t.key] : total
          return (
            <button
              key={t.key || 'all'}
              onClick={() => { setTab(t.key); setRows(null) }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'}`}
            >
              {t.label}{count ? <span className="ml-1.5 text-xs text-neutral-400">{count}</span> : null}
            </button>
          )
        })}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        {rows === null ? (
          <p className="p-8 text-center text-sm text-neutral-400">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-400">
            {tab === 'sent' ? 'Ninguna cotización esperando respuesta. 🎉' : 'Sin cotizaciones en esta categoría.'}
          </p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-right px-3 py-3">Total</th>
                <th className="text-right px-3 py-3">Aprobado</th>
                <th className="text-left px-3 py-3">Fecha</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const st = QUOTE_STATUS[q.status] ?? { label: q.status, cls: '' }
                const answered = q.status === 'approved' || q.status === 'partially_approved' || q.status === 'rejected'
                const late = q.status === 'sent' && (q.waitingDays ?? 0) >= 3
                const wa = q.status === 'sent' && q.customer
                  ? whatsappLink(q.customer.phone, waMessages.quoteReady(q.customer.name, q.vehicle ? `su ${q.vehicle.make} ${q.vehicle.model}` : 'su vehículo', money(q.total)))
                  : null
                return (
                  <tr key={q.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-5 py-3">
                      <Link href={`/work-orders/${q.workOrderId}/quotes/${q.id}`} className="font-semibold text-neutral-900 dark:text-white hover:underline">
                        {q.customer?.name ?? '—'}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {q.vehicle ? `${q.vehicle.make} ${q.vehicle.model} · ${q.vehicle.licensePlate}` : 'Sin vehículo'} · {q.itemsCount} partidas
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">{money(q.total)}</td>
                    <td className="px-3 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">{answered ? money(q.approvedTotal) : '—'}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {q.status === 'sent' ? (
                        <span className={late ? 'font-semibold text-red-600 dark:text-red-400' : 'text-neutral-500'}>
                          {q.waitingDays === 0 ? 'Enviada hoy' : `Esperando ${q.waitingDays} ${q.waitingDays === 1 ? 'día' : 'días'}`}
                        </span>
                      ) : q.status === 'draft' ? (
                        <span className="text-neutral-500">Sin enviar · {day(q.createdAt)}</span>
                      ) : (
                        <span className="text-neutral-500">
                          {q.respondedAt ? `${day(q.respondedAt)} · ${q.respondedVia === 'app' ? 'desde la app' : 'por el taller'}` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#128C4B] hover:underline">💬 WhatsApp</a>}
                      <Link href={`/work-orders/${q.workOrderId}`} className="text-xs font-semibold text-blue-600 hover:underline">Orden</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {rows && meta && rows.length < meta.total && (
          <div className="p-3 text-center border-t border-neutral-100 dark:border-neutral-800">
            <button onClick={() => void loadMore()} disabled={loadingMore} className="text-sm font-semibold text-blue-600 hover:underline disabled:opacity-50">
              {loadingMore ? 'Cargando…' : `Cargar más (${meta.total - rows.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
