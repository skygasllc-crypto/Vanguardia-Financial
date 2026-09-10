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

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo wordmark={false} />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-900',
                isActive && 'bg-navy-900 text-white hover:bg-navy-900 hover:text-white',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-100" />
            <Link
              href="/admin/dashboard"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-900',
                pathname?.startsWith('/admin') && 'bg-navy-900 text-white hover:bg-navy-900 hover:text-white',
              )}
            >
              <AdminIcon className="h-[18px] w-[18px]" />
              Admin Dashboard
            </Link>
          </>
        )}
      </nav>

    </aside>
  )
}
