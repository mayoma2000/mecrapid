'use client'

import { useEffect, useState } from 'react'

// Reloj que se actualiza cada `ms` para mostrar cronómetros en vivo
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}
