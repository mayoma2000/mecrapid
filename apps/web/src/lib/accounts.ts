import { db } from '@/src/prisma/db'

// Cuenta de la app vinculada a una ficha de cliente (por correo)
export type AppAccount = {
  id: string
  role: string
  active: boolean
  createdAt: string
  lastSeenAt: string | null
}

export async function appAccountsByEmail(emails: (string | null | undefined)[]): Promise<Map<string, AppAccount>> {
  const list = [...new Set(emails.filter((e): e is string => !!e).map((e) => e.toLowerCase()))]
  const map = new Map<string, AppAccount>()
  if (list.length === 0) return map
  const users = await db.orm.public.User.where((u) => u.email.in(list)).include('sessions').all()
  for (const u of users) {
    map.set(u.email.toLowerCase(), {
      id: u.id,
      role: u.role ?? 'user',
      active: !u.banned,
      createdAt: u.createdAt,
      lastSeenAt: u.sessions.reduce<string | null>((max, s) => (!max || s.updatedAt > max ? s.updatedAt : max), null),
    })
  }
  return map
}
