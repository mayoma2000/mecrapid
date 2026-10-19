'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Appointment = {
  id: string; scheduledAt: string; serviceType: string; status: string; notes: string | null; duration: number
  customer: { id: string; name: string }
  vehicle: { id: string; make: string; model: string; year: number; licensePlate: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada', confirmed: 'Confirmada', in_progress: 'En Progreso',
  completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
}
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
}
const ALL_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [form, setForm] = useState({ scheduledAt: '', serviceType: '', notes: '', duration: '60', status: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch(`/api/v1/appointments/${id}`)
      .then((r) => r.json() as Promise<{ data: Appointment }>)
      .then(({ data }) => {
        setAppt(data)
        const local = new Date(data.scheduledAt)
        const pad = (n: number) => String(n).padStart(2, '0')
        const localStr = `${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`
        setForm({ scheduledAt: localStr, serviceType: data.serviceType, notes: data.notes ?? '', duration: String(data.duration), status: data.status })
      })
  }, [id])

  function set(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })); setSuccess(false) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch(`/api/v1/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        serviceType: form.serviceType,
        notes: form.notes || null,
        duration: Number(form.duration),
        status: form.status,
      }),
    })
    if (!res.ok) { setError((await res.json() as { error?: string }).error ?? 'Error') }
    else { setSuccess(true); setAppt((prev) => prev ? { ...prev, status: form.status } : prev) }
    setSaving(false)
  }

  const cls = 'w-full border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (!appt) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/appointments" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">←</Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Cita</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[appt.status] ?? ''}`}>
              {STATUS_LABEL[appt.status] ?? appt.status}
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            <Link href={`/customers/${appt.customer.id}`} className="text-blue-600 hover:underline">{appt.customer.name}</Link>
            {appt.vehicle && <> · <Link href={`/vehicles/${appt.vehicle.id}`} className="hover:underline">{appt.vehicle.licensePlate}</Link></>}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha y hora</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} className={cls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo de servicio</label>
            <input value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} className={cls} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Duración (min)</label>
            <input type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)} min="15" step="15" className={cls} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={cls}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas</label>
          <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={cls} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Guardado.</p>}

        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
