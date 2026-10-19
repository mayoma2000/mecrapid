'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type ServiceItem = { id: string; description: string; cost: number }
type PartItem = { id: string; name: string; quantity: number; unitPrice: number; totalPrice: number }
type WorkOrder = {
  id: string; status: string; complaint: string; diagnosis: string | null
  estimatedCost: number | null; actualCost: number | null; completedAt: string | null
  customer: { id: string; name: string }
  vehicle: { id: string; make: string; model: string; year: number; licensePlate: string }
  serviceItems: ServiceItem[]
  partItems: PartItem[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignado', in_progress: 'En Proceso',
  quality_check: 'Control Calidad', completed: 'Completado', cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  quality_check: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}
const TRANSITIONS: Record<string, string[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['quality_check', 'cancelled'],
  quality_check: ['completed', 'in_progress'],
  completed: [], cancelled: [],
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<WorkOrder | null>(null)
  const [updating, setUpdating] = useState(false)
  const [editDiagnosis, setEditDiagnosis] = useState('')
  const [editCost, setEditCost] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetch(`/api/v1/work-orders/${id}`)
      .then((r) => r.json() as Promise<{ data: WorkOrder }>)
      .then(({ data }) => {
        setOrder(data)
        setEditDiagnosis(data.diagnosis ?? '')
        setEditCost(data.estimatedCost != null ? String(data.estimatedCost) : '')
      })
  }, [id])

  async function transition(newStatus: string) {
    setUpdating(true)
    const res = await fetch(`/api/v1/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const { data } = await res.json() as { data: WorkOrder }
    setOrder((prev) => prev ? { ...prev, status: data.status, completedAt: data.completedAt } : prev)
    setUpdating(false)
  }

  async function saveDiagnosis(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/v1/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis: editDiagnosis, estimatedCost: editCost ? Number(editCost) : null }),
    })
    setOrder((prev) => prev ? { ...prev, diagnosis: editDiagnosis, estimatedCost: editCost ? Number(editCost) : null } : prev)
    setSaving(false)
  }

  if (!order) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  const nextStates = TRANSITIONS[order.status] ?? []

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/work-orders" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Orden #{order.id.slice(-8).toUpperCase()}</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? ''}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            <Link href={`/customers/${order.customer.id}`} className="hover:underline text-blue-600">{order.customer.name}</Link>
            {' · '}
            <Link href={`/vehicles/${order.vehicle.id}`} className="hover:underline">{order.vehicle.year} {order.vehicle.make} {order.vehicle.model} ({order.vehicle.licensePlate})</Link>
          </p>
        </div>
      </div>

      {/* Problem */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Problema reportado</h2>
        <p className="text-neutral-900 dark:text-white">{order.complaint}</p>
      </div>

      {/* Diagnosis + cost editable */}
      <form onSubmit={(e) => void saveDiagnosis(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Diagnóstico y costo</h2>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Diagnóstico</label>
          <textarea rows={3} value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} className="w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Costo estimado (L.)</label>
          <input type="number" value={editCost} onChange={(e) => setEditCost(e.target.value)} min="0" step="0.01" className="w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? 'Guardando…' : 'Guardar diagnóstico'}
        </button>
      </form>

      {/* Status transitions */}
      {nextStates.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
          <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Cambiar estado</h2>
          <div className="flex gap-2 flex-wrap">
            {nextStates.map((s) => (
              <button
                key={s}
                onClick={() => void transition(s)}
                disabled={updating}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-60 ${
                  s === 'cancelled'
                    ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20'
                }`}
              >
                → {STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Service items */}
      {order.serviceItems.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Servicios</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.serviceItems.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 text-neutral-900 dark:text-white">{s.description}</td>
                  <td className="px-5 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">L. {s.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Part items */}
      {order.partItems.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm uppercase tracking-wide">Repuestos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="text-left px-5 py-3 font-medium text-neutral-500">Repuesto</th>
                <th className="text-right px-5 py-3 font-medium text-neutral-500">Cant.</th>
                <th className="text-right px-5 py-3 font-medium text-neutral-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.partItems.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-neutral-900 dark:text-white">{p.name}</td>
                  <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{p.quantity}</td>
                  <td className="px-5 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">L. {p.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
