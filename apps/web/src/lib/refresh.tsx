'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// "Reloj" del backoffice: sube cada 15 s mientras la pestaña está visible y al volver a ella.
// Las páginas lo ponen en las dependencias de su carga de datos para mantenerse al día.
const RefreshContext = createContext(0)

export function RefreshProvider({ children, intervalMs = 15_000 }: { children: ReactNode; intervalMs?: number }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => { if (document.visibilityState === 'visible') setTick((t) => t + 1) }
    const timer = setInterval(bump, intervalMs)
    document.addEventListener('visibilitychange', bump)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', bump) }
  }, [intervalMs])
  return <RefreshContext.Provider value={tick}>{children}</RefreshContext.Provider>
}

export function useRefreshTick(): number {
  return useContext(RefreshContext)
}
