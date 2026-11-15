'use client'

import { useEffect, useState } from 'react'
import { money } from '@/src/lib/quote-labels'

type Month = { month: string; label: string; revenue: number; orders: number; avgTicket: number; vehicles: number }
type Report = {
  kpis: {
    revenue: number; orders: number; avgTicket: number; vehicles: number; customers: number
    quoteApprovalRate: number | null
    change: { revenue: number | null; orders: number | null; avgTicket: number | null; vehicles: number | null }
  }
  monthly: Month[]
  mechanics: { id: string; name: string; active: boolean; orders: number; revenue: number; hours: number; hoursPerOrder: number | null }[]
  topServices: { name: string; count: number; amount: number }[]
  topParts: { name: string; count: number; amount: number }[]
}

const RANGES = [
  { months: 1, label: 'Este mes' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
]
const card = 'bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800'
// Serie única: azul de referencia validado (light #2a78d6 / dark #3987e5, ≥ 3:1 sobre la superficie)
const BAR = 'fill-[#2a78d6] dark:fill-[#3987e5]'
const BAR_BG = 'bg-[#2a78d6] dark:bg-[#3987e5]'
const shortMoney = (n: number) => (n >= 1000 ? `L ${(n / 1000).toLocaleString('es-HN', { maximumFractionDigits: 1 })}k` : `L ${Math.round(n)}`)

async function fetchReport(months: number): Promise<Report | null> {
  const res = await fetch(`/api/v1/reports?months=${months}`)
  return res.ok ? ((await res.json()) as { data: Report }).data : null
}

export default function ReportsPage() {
  const [months, setMonths] = useState(6)
  const [report, setReport] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void fetchReport(months).then((r) => { setReport(r); setFailed(!r) })
  }, [months])

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Filtro de período: una sola fila arriba de todo */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Reportes</h1>
          <p className="text-sm text-neutral-500 mt-1">Órdenes completadas en el período. Montos con ISV cuando vienen de cotizaciones aprobadas.</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1" role="tablist" aria-label="Período">
          {RANGES.map((r) => (
            <button
              key={r.months}
              role="tab"
              aria-selected={months === r.months}
              onClick={() => setMonths(r.months)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${months === r.months ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <p className="text-sm text-red-500">No se pudo cargar el reporte.</p>
      ) : !report ? (
        <p className="text-sm text-neutral-400">Cargando…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Ingresos" value={money(report.kpis.revenue)} change={report.kpis.change.revenue} />
            <Stat label="Ticket promedio" value={money(report.kpis.avgTicket)} change={report.kpis.change.avgTicket} />
            <Stat label="Órdenes completadas" value={String(report.kpis.orders)} change={report.kpis.change.orders} />
            <Stat label="Carros atendidos" value={String(report.kpis.vehicles)} change={report.kpis.change.vehicles} />
            <Stat
              label="Aprobación de cotizaciones"
              value={report.kpis.quoteApprovalRate != null ? `${report.kpis.quoteApprovalRate}%` : '—'}
              hint="partidas aprobadas de las que el cliente respondió"
            />
          </div>

          <RevenueChart monthly={report.monthly} />

          <div className="grid lg:grid-cols-2 gap-5">
            <MechanicsTable mechanics={report.mechanics} />
            <RankedList title="Servicios más vendidos" rows={report.topServices} unit="veces" empty="Todavía no hay servicios en órdenes completadas." />
          </div>
          {report.topParts.length > 0 && (
            <RankedList title="Repuestos más usados" rows={report.topParts} unit="unid." empty="" />
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, change, hint }: { label: string; value: string; change?: number | null; hint?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">{value}</p>
      {change !== undefined && (
        <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">
          {change == null ? 'sin datos del período anterior' : (
            <><span aria-hidden>{change > 0 ? '▲' : change < 0 ? '▼' : '■'}</span> {change > 0 ? '+' : ''}{change}% vs. período anterior</>
          )}
        </p>
      )}
      {hint && <p className="text-xs mt-1 text-neutral-400">{hint}</p>}
    </div>
  )
}

// Columnas de ingreso mensual: una serie (sin leyenda, el título la nombra), barras finas
// con punta redondeada y base recta, grilla tenue, tooltip al pasar y vista de tabla
function RevenueChart({ monthly }: { monthly: Month[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)

  const W = 720, H = 240, padL = 48, padB = 28, padT = 16
  const max = Math.max(...monthly.map((m) => m.revenue), 0)
  // Escala "redonda" para que las líneas guía caigan en números legibles
  const step = max <= 0 ? 1000 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1)
  const top = max <= 0 ? 4000 : Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).filter((_, i, arr) => arr.length <= 6 || i % 2 === 0)
  const band = (W - padL) / monthly.length
  const barW = Math.min(24, band * 0.5)
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top)
  const peak = monthly.reduce((best, m, i) => (m.revenue > (monthly[best]?.revenue ?? 0) ? i : best), 0)

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">Ingresos por mes</h2>
        <button onClick={() => setAsTable(!asTable)} className="text-xs font-semibold text-blue-600 hover:underline">
          {asTable ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
              <th className="py-2">Mes</th><th className="py-2 text-right">Ingresos</th><th className="py-2 text-right">Órdenes</th><th className="py-2 text-right">Ticket prom.</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.month} className="border-b border-neutral-50 dark:border-neutral-800/50 text-neutral-700 dark:text-neutral-300">
                <td className="py-2 capitalize">{m.label}</td>
                <td className="py-2 text-right tabular-nums">{money(m.revenue)}</td>
                <td className="py-2 text-right tabular-nums">{m.orders}</td>
                <td className="py-2 text-right tabular-nums">{m.orders ? money(m.avgTicket) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Ingresos por mes">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth={1} />
                <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-neutral-400 text-[11px] tabular-nums">{shortMoney(t)}</text>
              </g>
            ))}
            {monthly.map((m, i) => {
              const cx = padL + band * i + band / 2
              const h = Math.max(0, y(0) - y(m.revenue))
              const r = Math.min(4, h)
              const x0 = cx - barW / 2, x1 = cx + barW / 2, yTop = y(m.revenue), yBase = y(0)
              return (
                <g key={m.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  {/* Zona de hover más grande que la barra */}
                  <rect x={padL + band * i} y={padT} width={band} height={H - padT - padB} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x0},${yBase} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x1 - r} Q${x1},${yTop} ${x1},${yTop + r} V${yBase} Z`}
                      className={BAR}
                      opacity={hover == null || hover === i ? 1 : 0.55}
                    />
                  )}
                  {/* Etiqueta directa solo en el pico */}
                  {i === peak && m.revenue > 0 && (
                    <text x={cx} y={yTop - 6} textAnchor="middle" className="fill-neutral-700 dark:fill-neutral-300 text-[11px] font-semibold tabular-nums">{shortMoney(m.revenue)}</text>
                  )}
                  <text x={cx} y={H - 8} textAnchor="middle" className="fill-neutral-500 text-[11px] capitalize">{m.label}</text>
                </g>
              )
            })}
            <line x1={padL} x2={W} y1={y(0)} y2={y(0)} className="stroke-neutral-300 dark:stroke-neutral-700" strokeWidth={1} />
          </svg>
          {hover != null && monthly[hover] && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
              style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%`, top: `${(Math.max(padT, y(monthly[hover]!.revenue)) / H) * 100}%` }}
            >
              <p className="font-semibold capitalize">{monthly[hover]!.label}</p>
              <p className="tabular-nums">{money(monthly[hover]!.revenue)} · {monthly[hover]!.orders} órdenes</p>
            </div>
          )}
          {max === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">Sin órdenes completadas en el período</p>}
        </div>
      )}
    </div>
  )
}

function MechanicsTable({ mechanics }: { mechanics: Report['mechanics'] }) {
  const maxOrders = Math.max(1, ...mechanics.map((m) => m.orders))
  return (
    <div className={`${card} p-5`}>
      <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Productividad por mecánico</h2>
      {mechanics.length === 0 ? (
        <p className="text-sm text-neutral-400">Sin mecánicos registrados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="pb-2">Mecánico</th><th className="pb-2">Órdenes</th><th className="pb-2 text-right">Horas</th><th className="pb-2 text-right">h/orden</th><th className="pb-2 text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {mechanics.map((m) => (
              <tr key={m.id} className={`border-t border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 ${m.active ? '' : 'opacity-50'}`}>
                <td className="py-2.5 font-semibold text-neutral-900 dark:text-white">{m.name}</td>
                <td className="py-2.5 w-40">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${BAR_BG}`} style={{ width: `${(m.orders / maxOrders) * 100}%` }} />
                    </div>
                    <span className="tabular-nums w-6 text-right">{m.orders}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums">{m.hours.toLocaleString('es-HN')}</td>
                <td className="py-2.5 text-right tabular-nums">{m.hoursPerOrder ?? '—'}</td>
                <td className="py-2.5 text-right tabular-nums">{money(m.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-neutral-400 mt-3">Horas = tiempo cronometrado con Iniciar/Pausar/Terminar.</p>
    </div>
  )
}

function RankedList({ title, rows, unit, empty }: { title: string; rows: { name: string; count: number; amount: number }[]; unit: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className={`${card} p-5`}>
      <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.name} className="text-sm" title={`${r.name}: ${r.count} ${unit} · ${money(r.amount)}`}>
              <div className="flex justify-between gap-3 text-neutral-700 dark:text-neutral-300">
                <span className="truncate">{r.name}</span>
                <span className="tabular-nums whitespace-nowrap text-neutral-500">{r.count.toLocaleString('es-HN')} {unit} · {money(r.amount)}</span>
              </div>
              <div className="mt-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${BAR_BG}`} style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
