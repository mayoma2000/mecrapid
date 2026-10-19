'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Vehicle = { id: string; make: string; model: string; year: number; licensePlate: string; customer: { id: string; name: string } }

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    void fetch('/api/v1/vehicles?limit=100')
      .then((r) => r.json() as Promise<{ data: Vehicle[] }>)
      .then(({ data }) => { setVehicles(data); setLoading(false) })
  }, [])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Vehículos</h1>
        <Link href="/vehicles/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuevo
        </Link>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Cargando…</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Sin vehículos registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Vehículo</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Placa</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                  onClick={() => router.push(`/vehicles/${v.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{v.year} {v.make} {v.model}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono">{v.licensePlate}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-neutral-500 dark:text-neutral-400">{v.customer.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
