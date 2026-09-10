'use client'

import { useState } from 'react'
import Link from 'next/link'

import { ButtonLink } from '@/components/common/ButtonLink'
import { Logo } from '@/components/layout/Logo'
import { MegaMenu } from '@/components/layout/MegaMenu'
import { MegaMenuMobile } from '@/components/layout/MegaMenuMobile'

export function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b-4 border-accent-600 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-5 lg:px-12">
        <Link href="/" aria-label="Vanguardia Financial home">
          <Logo />
        </Link>

        <MegaMenu />

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-sm font-bold uppercase tracking-wide text-navy-800 hover:text-accent-600">
            Log In
          </Link>
          <ButtonLink href="/register" size="sm">
            Create Account
          </ButtonLink>
        </div>

        <button
          className="rounded-md p-2 text-navy-800 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 px-4 py-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col">
            <MegaMenuMobile onNavigate={() => setMenuOpen(false)} />
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4">
              <Link href="/login" className="text-sm font-semibold text-navy-800">
                Log In
              </Link>
              <ButtonLink href="/register" size="sm" fullWidth>
                Create Account
              </ButtonLink>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
