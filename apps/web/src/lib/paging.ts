import type { NextRequest } from 'next/server'

// ?limit=&offset= opcionales. Sin limit se devuelve todo (compatibilidad con
// versiones de la app que todavía no paginan).
export function parsePaging(request: NextRequest, max = 50): { limit: number | null; offset: number } {
  const sp = request.nextUrl.searchParams
  const rawLimit = sp.get('limit')
  const limit = rawLimit == null ? null : Math.min(max, Math.max(1, Number(rawLimit) || 20))
  const offset = Math.max(0, Number(sp.get('offset') ?? '0') || 0)
  return { limit, offset }
}
