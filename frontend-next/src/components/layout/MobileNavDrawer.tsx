'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Logo } from '@/components/layout/Logo'
import {
  AdminIcon,
  DashboardIcon,
  MarketsIcon,
  PortfolioIcon,
  SecurityIcon,
  TradeIcon,
  WalletIcon,
  WatchlistIcon,
} from '@/components/layout/icons'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'

const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/app/markets', label: 'Markets', icon: MarketsIcon },
  { href: '/app/trade', label: 'Trade', icon: TradeIcon },
  { href: '/app/accounts', label: 'Accounts', icon: WalletIcon },
  { href: '/app/portfolio', label: 'Portfolio', icon: PortfolioIcon },
  { href: '/app/watchlist', label: 'Watchlist', icon: WatchlistIcon },
  { href: '/app/wallet', label: 'Wallet', icon: WalletIcon },
  { href: '/app/security', label: 'Security', icon: SecurityIcon },
]

export function MobileNavDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-72 flex-col bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo size="sm" />
          <button onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600', isActive && 'bg-navy-900 text-white')}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              onClick={onClose}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600', pathname?.startsWith('/admin') && 'bg-navy-900 text-white')}
            >
              <AdminIcon className="h-[18px] w-[18px]" />
              Admin Dashboard
            </Link>
          )}
        </nav>
      </div>
    </div>
  )
}
