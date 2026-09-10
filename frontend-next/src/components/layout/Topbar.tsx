'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { LiveIndicator } from '@/components/common/LiveIndicator'
import { ChevronDownIcon, MenuIcon } from '@/components/layout/icons'
import { useAuthStore } from '@/store/authStore'

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'VT'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-md p-1.5 text-navy-700 lg:hidden" onClick={onMenuClick} aria-label="Open navigation menu">
          <MenuIcon />
        </button>
        <h1 className="font-display text-lg font-semibold text-navy-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <LiveIndicator className="hidden sm:flex" />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-sm font-medium text-navy-800 sm:inline">{user?.full_name ?? 'Account'}</span>
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-card-lg)]">
                <Link href="/app/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-navy-800 hover:bg-slate-50">
                  Profile
                </Link>
                <Link href="/app/security" role="menuitem" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-navy-800 hover:bg-slate-50">
                  Security
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    router.push('/')
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-loss-600 hover:bg-loss-50"
                >
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
