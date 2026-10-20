'use client'

import { useEffect, useState } from 'react'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type ScheduleRow = { id: string; dayOfWeek: number; startHour: number; endHour: number; active: boolean }
type EditRow = { dayOfWeek: number; startHour: number; endHour: number; active: boolean }

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6..22

function pad(n: number) { return String(n).padStart(2, '0') }

export default function WorkSchedulePage() {
  const [rows, setRows] = useState<EditRow[]>(
    Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startHour: 8, endHour: 17, active: i !== 0 }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void fetch('/api/v1/work-schedule')
      .then((r) => r.json() as Promise<{ data: ScheduleRow[] }>)
      .then(({ data }) => {
        if (data?.length === 7) {
          const sorted = [...data].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          setRows(sorted.map(({ dayOfWeek, startHour, endHour, active }) => ({ dayOfWeek, startHour, endHour, active })))
        }
        setLoading(false)
      })
  }, [])

  function update(dayOfWeek: number, key: keyof EditRow, value: boolean | number) {
    setRows((prev) => prev.map((r) => r.dayOfWeek === dayOfWeek ? { ...r, [key]: value } : r))
    setSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setSuccess(false)
    const res = await fetch('/api/v1/work-schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    setSaving(false)
    if (res.ok) setSuccess(true)
  }

  if (loading) return <div className="p-6 text-neutral-400 text-sm">Cargando…</div>

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Horario Laboral</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Define qué días y en qué horario el taller atiende citas.</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl border border-green-200 dark:border-green-800">
          ✓ Horario actualizado
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 gap-4">
          <span>Día</span>
          <span className="text-center">Activo</span>
          <span>Hora inicio</span>
          <span>Hora fin</span>
        </div>
        {rows.map((row) => (
          <div key={row.dayOfWeek} className="grid grid-cols-[1fr_auto_1fr_1fr] items-center px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0 gap-4">
            <span className={`text-sm font-semibold ${row.active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
              {DAY_NAMES[row.dayOfWeek]}
            </span>
            <div className="flex justify-center">
              <button
                onClick={() => update(row.dayOfWeek, 'active', !row.active)}
                className={`w-11 h-6 rounded-full transition-colors relative ${row.active ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                aria-label="toggle"
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${row.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <select
              value={row.startHour}
              onChange={(e) => update(row.dayOfWeek, 'startHour', Number(e.target.value))}
              disabled={!row.active}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOURS.filter((h) => h < row.endHour).map((h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
            <select
              value={row.endHour}
              onChange={(e) => update(row.dayOfWeek, 'endHour', Number(e.target.value))}
              disabled={!row.active}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOURS.filter((h) => h > row.startHour).map((h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
