'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/src/lib/auth-client'

const NAV = [
  { href: '/dashboard', label: 'Tablero', icon: '📊' },
  { href: '/customers', label: 'Clientes', icon: '👥' },
  { href: '/vehicles', label: 'Vehículos', icon: '🚗' },
  { href: '/work-orders', label: 'Órdenes', icon: '🔧' },
  { href: '/appointments', label: 'Citas', icon: '📅' },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    router.push('/sign-in')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-neutral-900 dark:text-white">MecRapid</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-neutral-900 flex flex-col shadow-xl">
            <NavContent pathname={pathname} onClose={() => setOpen(false)} onSignOut={handleSignOut} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 sticky top-0 h-screen flex-shrink-0">
        <NavContent pathname={pathname} onSignOut={handleSignOut} />
      </div>
    </>
  )
}

function NavContent({
  pathname,
  onClose,
  onSignOut,
}: {
  pathname: string
  onClose?: () => void
  onSignOut: () => void
}) {
  return (
    <>
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
        <span className="font-bold text-lg text-neutral-900 dark:text-white">MecRapid</span>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Backoffice</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <span className="text-base">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
