'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthStore } from '@/store/authStore'

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Admin Overview',
  '/admin/users': 'User Management',
  '/admin/deposits': 'Deposit Management',
  '/admin/audit-logs': 'Audit Logs',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES).find((key) => pathname.startsWith(key))
  return match ? TITLES[match] : 'Admin Console'
}

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isInitializing) return
    if (!user) {
      router.replace('/login')
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      router.replace('/app/dashboard')
    }
  }, [isInitializing, user, router])

  if (isInitializing || !user || (user.role !== 'admin' && user.role !== 'super_admin')) return null

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={resolveTitle(pathname)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
