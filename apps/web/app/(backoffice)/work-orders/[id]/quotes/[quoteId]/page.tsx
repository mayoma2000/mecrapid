'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { KIND_LABEL, PRIORITY, QUOTE_STATUS, money } from '@/src/lib/quote-labels'
import { toDate } from '@/src/lib/job-time'
import { waMessages, whatsappLink } from '@/src/lib/whatsapp'

type Item = {
  id?: string
  kind: 'service' | 'part'
  description: string
  quantity: number
  unitPrice: number
  priority: 'urgent' | 'recommended' | 'optional'
  decision?: string
}
type Quote = {
  id: string; workOrderId: string; status: string; notes: string | null; taxRate: number
  sentAt: string | null; respondedAt: string | null; respondedVia: string | null; responseNote: string | null
  workOrder: { customer: { name: string; phone: string } | null; vehicle: { make: string; model: string } | null } | null
  items: Item[]; subtotal: number; tax: number; total: number; approvedSubtotal: number; approvedTotal: number
}
type ServiceType = { id: string; name: string; price: number | null }

const input = 'border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const card = 'bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800'
const fmt = (s: string) => toDate(s).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

async function fetchQuote(id: string): Promise<Quote | null> {
  const res = await fetch(`/api/v1/quotes/${id}`)
  return res.ok ? ((await res.json()) as { data: Quote }).data : null
}

export default function QuotePage() {
  const { id: orderId, quoteId } = useParams<{ id: string; quoteId: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [missing, setMissing] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [notes, setNotes] = useState('')
  const [withTax, setWithTax] = useState(true)
  const [catalog, setCatalog] = useState<ServiceType[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Respuesta registrada por el taller
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [responseNote, setResponseNote] = useState('')

  function apply(q: Quote | null) {
    if (!q) { setMissing(true); return }
    setQuote(q)
    setItems(q.items.map((i) => ({ ...i })))
    setNotes(q.notes ?? '')
    setWithTax(q.taxRate > 0)
  }

  useEffect(() => {
    void fetchQuote(quoteId).then(apply)
    void fetch('/api/v1/service-types')
      .then((r) => r.json() as Promise<{ data: ServiceType[] }>)
      .then(({ data }) => setCatalog(data ?? []))
  }, [quoteId])

  if (missing) return <div className="p-6 text-sm text-red-500">Cotización no encontrada</div>
  if (!quote) return <div className="p-6 text-sm text-neutral-400">Cargando…</div>

  const draft = quote.status === 'draft'
  const st = QUOTE_STATUS[quote.status] ?? { label: quote.status, cls: '' }
  const taxRate = draft ? (withTax ? 0.15 : 0) : quote.taxRate
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const addItem = (kind: Item['kind'], description = '', unitPrice = 0) =>
    setItems((prev) => [...prev, { kind, description, quantity: 1, unitPrice, priority: 'recommended' }])

  async function request(url: string, method: string, body?: unknown): Promise<{ data?: Quote } | null> {
    setBusy(true); setError('')
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    setBusy(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({})) as { error?: string }).error ?? 'Error')
      return null
    }
    return res.status === 204 ? {} : ((await res.json()) as { data: Quote })
  }

  async function save() {
    const res = await request(`/api/v1/quotes/${quoteId}`, 'PATCH', { notes, taxRate, items })
    if (res?.data) apply(res.data)
    return !!res
  }

  async function send() {
    if (items.length === 0) { setError('Agregá al menos una partida'); return }
    if (!window.confirm('¿Enviar la cotización al cliente? Después ya no se puede editar.')) return
    if (!(await save())) return
    const res = await request(`/api/v1/quotes/${quoteId}/send`, 'POST')
    if (res?.data) apply(res.data)
  }

  async function remove() {
    if (!window.confirm('¿Borrar este borrador?')) return
    if (await request(`/api/v1/quotes/${quoteId}`, 'DELETE')) router.push(`/work-orders/${orderId}`)
  }

  async function registerResponse() {
    const res = await request(`/api/v1/quotes/${quoteId}/respond`, 'POST', {
      note: responseNote,
      decisions: Object.entries(decisions).map(([itemId, decision]) => ({ itemId, decision })),
    })
    if (res?.data) apply(res.data)
  }

  const allDecided = quote.items.every((i) => i.id && decisions[i.id])

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/work-orders/${orderId}`} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">←</Link>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Cotización</h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
        {quote.sentAt && <span className="text-xs text-neutral-500">Enviada {fmt(quote.sentAt)}</span>}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

      {/* Partidas */}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Partida</th>
              <th className="text-left px-2 py-3">Prioridad</th>
              <th className="text-right px-2 py-3 w-20">Cant.</th>
              <th className="text-right px-2 py-3 w-28">Precio</th>
              <th className="text-right px-4 py-3 w-28">Total</th>
              <th className="px-3 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sin partidas todavía</td></tr>
            )}
            {items.map((it, idx) => (
              <tr key={it.id ?? `new-${idx}`} className={it.decision === 'rejected' ? 'opacity-50' : ''}>
                <td className="px-4 py-2.5">
                  {draft ? (
                    <div className="flex gap-2">
                      <select value={it.kind} onChange={(e) => setItem(idx, { kind: e.target.value as Item['kind'] })} className={input}>
                        <option value="service">Servicio</option>
                        <option value="part">Repuesto</option>
                      </select>
                      <input value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} placeholder="Descripción" className={`${input} flex-1 min-w-0`} />
                    </div>
                  ) : (
                    <span className="text-neutral-900 dark:text-white">
                      <span className="text-xs text-neutral-400 mr-1.5">{KIND_LABEL[it.kind]}</span>{it.description}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {draft ? (
                    <select value={it.priority} onChange={(e) => setItem(idx, { priority: e.target.value as Item['priority'] })} className={input}>
                      {Object.entries(PRIORITY).map(([k, p]) => <option key={k} value={k}>{p.dot} {p.label}</option>)}
                    </select>
                  ) : (
                    <span className="whitespace-nowrap">{PRIORITY[it.priority]?.dot} {PRIORITY[it.priority]?.label}</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {draft
                    ? <input type="number" min="0" step="0.5" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} className={`${input} w-16 text-right`} />
                    : it.quantity}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {draft
                    ? <input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })} className={`${input} w-24 text-right`} />
                    : <span className="font-mono">{money(it.unitPrice)}</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-neutral-800 dark:text-neutral-200">{money(it.quantity * it.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right">
                  {draft ? (
                    <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-500 hover:underline">Quitar</button>
                  ) : quote.status === 'sent' && it.id ? (
                    <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs font-semibold">
                      <button onClick={() => setDecisions({ ...decisions, [it.id!]: 'approved' })} className={`px-2 py-1 ${decisions[it.id] === 'approved' ? 'bg-green-600 text-white' : 'text-green-700'}`}>✓</button>
                      <button onClick={() => setDecisions({ ...decisions, [it.id!]: 'rejected' })} className={`px-2 py-1 ${decisions[it.id] === 'rejected' ? 'bg-red-600 text-white' : 'text-red-600'}`}>✕</button>
                    </div>
                  ) : it.decision === 'approved' ? (
                    <span className="text-xs font-semibold text-green-600">✓ Aprobada</span>
                  ) : it.decision === 'rejected' ? (
                    <span className="text-xs font-semibold text-red-500">✕ Rechazada</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {draft && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <button onClick={() => addItem('service')} className="text-sm font-semibold text-blue-600 hover:underline">+ Servicio</button>
            <button onClick={() => addItem('part')} className="text-sm font-semibold text-blue-600 hover:underline">+ Repuesto</button>
            {catalog.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const t = catalog.find((c) => c.id === e.target.value)
                  if (t) addItem('service', t.name, t.price ?? 0)
                }}
                className={input}
              >
                <option value="">+ Del catálogo de servicios…</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}{c.price != null ? ` · ${money(c.price)}` : ''}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Totales */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400"><span>Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400 items-center">
            <label className="flex items-center gap-2">
              {draft && <input type="checkbox" checked={withTax} onChange={(e) => setWithTax(e.target.checked)} />}
              ISV {Math.round(taxRate * 100)}%
            </label>
            <span className="font-mono">{money(subtotal * taxRate)}</span>
          </div>
          <div className="flex justify-between font-bold text-neutral-900 dark:text-white text-base"><span>Total</span><span className="font-mono">{money(subtotal * (1 + taxRate))}</span></div>
          {(quote.status === 'approved' || quote.status === 'partially_approved') && (
            <div className="flex justify-between font-semibold text-green-700 dark:text-green-400"><span>Aprobado por el cliente</span><span className="font-mono">{money(quote.approvedTotal)}</span></div>
          )}
        </div>
      </div>

      {/* Notas */}
      {draft ? (
        <div className={`${card} p-4 space-y-2`}>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nota para el cliente</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Las pastillas están al 10%, recomendamos cambiarlas ya." className={`${input} w-full`} />
        </div>
      ) : quote.notes ? (
        <div className={`${card} p-4 text-sm text-neutral-700 dark:text-neutral-300`}><span className="font-semibold">Nota: </span>{quote.notes}</div>
      ) : null}

      {/* Acciones */}
      {draft && (
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => void send()} disabled={busy} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            📤 Enviar al cliente
          </button>
          <button onClick={() => void save()} disabled={busy} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-50">
            Guardar borrador
          </button>
          <button onClick={() => void remove()} disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-red-600 ml-auto">Borrar</button>
        </div>
      )}

      {quote.status === 'sent' && (() => {
        const c = quote.workOrder?.customer
        const v = quote.workOrder?.vehicle
        const link = c ? whatsappLink(c.phone, waMessages.quoteReady(c.name, v ? `su ${v.make} ${v.model}` : 'su vehículo', money(quote.total))) : null
        return link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:opacity-90">
            💬 Avisar por WhatsApp a {c!.name}
          </a>
        ) : null
      })()}

      {quote.status === 'sent' && (
        <div className={`${card} p-4 space-y-3`}>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            El cliente la ve en su app para aprobar o rechazar cada partida. Si respondió por teléfono o en persona, registralo aquí:
            marcá ✓ o ✕ en cada partida y anotá cómo autorizó.
          </p>
          <input value={responseNote} onChange={(e) => setResponseNote(e.target.value)} placeholder='Ej. "Aprobó por teléfono a las 10:30, habló con Marvin"' className={`${input} w-full`} />
          <button
            onClick={() => void registerResponse()}
            disabled={busy || !allDecided || !responseNote.trim()}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40"
          >
            Registrar respuesta del cliente
          </button>
        </div>
      )}

      {quote.respondedAt && (
        <div className={`${card} p-4 text-sm text-neutral-700 dark:text-neutral-300 space-y-1`}>
          <p>
            <span className="font-semibold">Respondida {fmt(quote.respondedAt)}</span>
            {' · '}{quote.respondedVia === 'app' ? 'por el cliente desde la app' : 'registrada por el taller'}
          </p>
          {quote.responseNote && <p className="text-neutral-500">“{quote.responseNote}”</p>}
          <p className="text-xs text-neutral-500">Las partidas aprobadas ya están en la orden como trabajo autorizado.</p>
        </div>
      )}
    </div>
  )
}
