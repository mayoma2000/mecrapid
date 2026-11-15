import { connection } from 'next/server'
import { auth } from '@/src/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarNav } from './sidebar-nav'
import { roleOf } from '@/src/lib/authz'

export const instant = false

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  // El backoffice es solo para el taller; los clientes usan la app móvil
  const role = roleOf(session)
  if (role === 'user') redirect('/sign-in?error=forbidden')

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <SidebarNav role={role} />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
