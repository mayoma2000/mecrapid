'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QUOTE_STATUS, money } from '@/src/lib/quote-labels'

type QuoteSummary = {
  id: string; status: string; createdAt: string; sentAt: string | null; respondedAt: string | null
  items: unknown[]; total: number; approvedTotal: number
}

async function fetchQuotes(orderId: string): Promise<QuoteSummary[]> {
  const res = await fetch(`/api/v1/work-orders/${orderId}/quotes`)
  return res.ok ? ((await res.json()) as { data: QuoteSummary[] }).data : []
}

// Cotizaciones de la orden: la inicial y las de trabajos extra que vayan saliendo
export function QuotesPanel({ orderId, closed }: { orderId: string; closed: boolean }) {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { void fetchQuotes(orderId).then(setQuotes) }, [orderId])

  async function create() {
    setCreating(true); setError('')
    const res = await fetch(`/api/v1/work-orders/${orderId}/quotes`, { method: 'POST' })
    const json = await res.json() as { data?: { id: string }; error?: string }
    setCreating(false)
    // Si ya hay un borrador, se abre ese
    if (json.data?.id) router.push(`/work-orders/${orderId}/quotes/${json.data.id}`)
    else setError(json.error ?? 'No se pudo crear la cotización')
  }

  const hasDraft = quotes?.some((q) => q.status === 'draft')

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Cotizaciones</h2>
        {!closed && (
          <button onClick={() => void create()} disabled={creating} className="text-sm font-semibold text-blue-600 hover:underline disabled:opacity-50">
            {hasDraft ? 'Abrir borrador' : '+ Nueva cotización'}
          </button>
        )}
      </div>
      {error && <p className="px-5 py-3 text-sm text-red-500">{error}</p>}
      {quotes === null ? (
        <p className="px-5 py-4 text-sm text-neutral-400">Cargando…</p>
      ) : quotes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-400">Sin cotizaciones. Armá una con los servicios y repuestos para que el cliente la apruebe desde su app.</p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {quotes.map((q, i) => {
            const st = QUOTE_STATUS[q.status] ?? { label: q.status, cls: '' }
            const answered = q.status === 'approved' || q.status === 'partially_approved' || q.status === 'rejected'
            return (
              <Link key={q.id} href={`/work-orders/${orderId}/quotes/${q.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Cotización {i + 1} <span className="font-normal text-neutral-400">· {q.items.length} partidas</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {answered ? `Aprobado ${money(q.approvedTotal)} de ${money(q.total)}` : money(q.total)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
