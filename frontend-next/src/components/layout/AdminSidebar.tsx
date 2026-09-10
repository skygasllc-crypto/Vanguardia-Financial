'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Logo } from '@/components/layout/Logo'
import { AdminIcon, DashboardIcon, PortfolioIcon, ProfileIcon, SecurityIcon, WalletIcon } from '@/components/layout/icons'
import { cn } from '@/lib/cn'

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: DashboardIcon },
  { href: '/admin/users', label: 'Users', icon: ProfileIcon },
  { href: '/admin/deposits', label: 'Deposits', icon: WalletIcon },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: SecurityIcon },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-700 bg-navy-950 lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <Logo dark />
      </div>
      <div className="px-6 pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
          <AdminIcon className="h-3.5 w-3.5" /> Admin Console
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
                isActive && 'bg-accent-600 text-white hover:bg-accent-600',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-navy-700 px-3 py-4">
        <Link href="/app/dashboard" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          ← Back to investor app
        </Link>
      </div>
    </aside>
  )
}
