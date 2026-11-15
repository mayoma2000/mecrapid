import { headers } from 'next/headers'
import { auth, type Session } from '@/src/lib/auth'

// Roles del plugin admin de better-auth: 'admin' | 'mecanico' | 'user' (cliente)
export type Role = 'admin' | 'mecanico' | 'user'

export const STAFF_ROLES: Role[] = ['admin', 'mecanico']

export function roleOf(session: Session): Role {
  const role = (session.user as { role?: string | null }).role
  return role === 'admin' || role === 'mecanico' ? role : 'user'
}

type Guard = { ok: true; session: Session; role: Role } | { ok: false; response: Response }

// Uso en route handlers:
//   const g = await requireRole(STAFF_ROLES); if (!g.ok) return g.response
export async function requireRole(allowed?: Role[]): Promise<Guard> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  const role = roleOf(session)
  if (allowed && !allowed.includes(role)) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, session, role }
}
