'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRefreshTick } from '@/src/lib/refresh'

// El tablero se arma en el servidor: cada 15 s se vuelve a pedir para mantener los números al día
export function AutoRefresh() {
  const tick = useRefreshTick()
  const router = useRouter()
  useEffect(() => { if (tick > 0) router.refresh() }, [tick, router])
  return null
}
