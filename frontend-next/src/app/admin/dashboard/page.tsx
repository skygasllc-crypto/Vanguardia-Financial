'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { Spinner } from '@/components/common/Spinner'
import { StatCard } from '@/components/common/StatCard'
import { adminService } from '@/lib/adminService'
import type { AdminDashboardStats } from '@/types/admin'
import { formatCompactCurrency, formatDateTime } from '@/lib/format'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)

  useEffect(() => {
    adminService.getStats().then(setStats).catch(() => undefined)
  }, [])

  if (!stats) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.total_users.toLocaleString()} />
        <StatCard label="Active Users" value={stats.active_users.toLocaleString()} />
        <StatCard label="Total Trading Volume" value={formatCompactCurrency(stats.total_trading_volume)} />
        <StatCard label="Open Orders" value={stats.open_orders_count.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent Registrations" />
          {stats.recent_registrations.length === 0 ? (
            <EmptyState title="No registrations yet" />
          ) : (
            <div className="space-y-3">
              {stats.recent_registrations.map((u) => (
                <div key={String(u.id)} className="flex items-center justify-between text-sm">
                  <div>
                    <Link href={`/admin/users/detail?userId=${u.id}`} className="font-medium text-navy-900 hover:text-accent-600">
                      {String(u.full_name)}
                    </Link>
                    <p className="text-xs text-slate-500">{String(u.email)}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(String(u.created_at))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Trades" />
          {stats.recent_trades.length === 0 ? (
            <EmptyState title="No trades yet" />
          ) : (
            <div className="space-y-3">
              {stats.recent_trades.map((t) => (
                <div key={String(t.id)} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-navy-900">{String(t.symbol)}</span>
                    <span className="ml-2 text-xs uppercase text-slate-400">{String(t.side)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums text-navy-900">{formatCompactCurrency(String(t.total_value))}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(String(t.executed_at))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
