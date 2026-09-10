'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useWebSocketLifecycle } from '@/hooks/useWebSocketLifecycle'
import { useAccountStore } from '@/store/accountStore'
import { useAuthStore } from '@/store/authStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { usePositionsStore } from '@/store/positionsStore'
import { useWatchlistStore } from '@/store/watchlistStore'

const TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/markets': 'Markets',
  '/app/trade': 'Trading Terminal',
  '/app/portfolio': 'Portfolio',
  '/app/watchlist': 'Watchlist',
  '/app/wallet': 'Wallet',
  '/app/security': 'Security',
  '/app/profile': 'Profile',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES).find((key) => pathname.startsWith(key))
  return match ? TITLES[match] : 'Vanguardia Financial'
}

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useWebSocketLifecycle()

  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
  const fetchPositions = usePositionsStore((s) => s.fetchPositions)
  const fetchWallet = useAccountStore((s) => s.fetchWallet)
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)

  useEffect(() => {
    if (!isAuthenticated) return
    fetchPortfolio().catch(() => undefined)
    fetchPositions().catch(() => undefined)
    fetchWallet().catch(() => undefined)
    fetchWatchlist().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isInitializing, isAuthenticated, pathname, router])

  if (isInitializing || !isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <MobileNavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={resolveTitle(pathname)} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
