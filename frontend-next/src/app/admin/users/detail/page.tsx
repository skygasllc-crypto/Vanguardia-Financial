'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { StatCard } from '@/components/common/StatCard'
import { BalanceAdjustmentForm } from '@/components/admin/BalanceAdjustmentForm'
import { FinancialSettingsForm } from '@/components/admin/FinancialSettingsForm'
import { PositionManipulationControls } from '@/components/admin/PositionManipulationControls'
import { AccountLeverageControls } from '@/components/admin/AccountLeverageControls'
import { UserStatusControls } from '@/components/admin/UserStatusControls'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import type { AdminUserFinancialProfile } from '@/types/admin'
import type { Position } from '@/types/trading'
import { formatCurrency, formatDateTime } from '@/lib/format'

const TABS = ['Overview', 'Accounts', 'Live Positions', 'Trading Activity', 'Transactions', 'Admin Controls'] as const

function UserFinancialProfile() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') ?? ''
  const [profile, setProfile] = useState<AdminUserFinancialProfile | null>(null)
  const [livePositions, setLivePositions] = useState<Position[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)

  function reload() {
    adminService.getFinancialProfile(userId).then(setProfile).catch(() => toast.error('Could not load user financial profile.'))
  }

  function loadLivePositions() {
    adminService.getUserPositions(userId).then(positions => {
      setLivePositions(positions.filter(p => p.status === 'open'))
    }).catch(() => toast.error('Could not load live positions.'))
  }

  useEffect(() => {
    reload()
    loadLivePositions()
  }, [userId])

  if (!profile) return <Spinner />
  const { user } = profile

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="text-xs font-medium text-slate-400 hover:text-slate-600">← Back to Users</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900">{user.full_name}</h1>
          <p className="text-sm text-slate-500">{user.email} · User ID {user.display_id}</p>
          <div className="mt-2 flex gap-2">
            <Badge
              tone={user.status === 'active' ? 'gain' : user.status === 'banned' ? 'loss' : 'warning'}
              className="capitalize"
            >
              {user.status.replace(/_/g, ' ')}
            </Badge>
            <Badge tone={user.is_verified ? 'gain' : 'warning'}>{user.is_verified ? 'Verified' : 'Unverified'}</Badge>
            <Badge tone={user.risk_status === 'normal' ? 'neutral' : 'warning'} className="capitalize">{user.risk_status} risk</Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={() => setAdjustModalOpen(true)}>Adjust User Balance</Button>
          <UserStatusControls
            userId={user.id}
            status={user.status}
            onChanged={(next) =>
              setProfile((prev) => (prev ? { ...prev, user: { ...prev.user, status: next } } : prev))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Available Balance" value={formatCurrency(user.available_balance, user.currency)} />
        <StatCard label="Total Account Value" value={formatCurrency(user.total_account_value, user.currency)} />
        <StatCard label="Realized P&L" value={formatCurrency(user.total_realized_pnl, user.currency)} />
        <StatCard label="Unrealized P&L" value={formatCurrency(user.total_unrealized_pnl, user.currency)} />
        <StatCard label="Total Deposits (Admin)" value={formatCurrency(user.total_deposits, user.currency)} />
        <StatCard label="Total Withdrawals (Admin)" value={formatCurrency(user.total_withdrawals, user.currency)} />
        <StatCard label="Open Positions" value={user.open_positions_count} />
        <StatCard label="Open Orders" value={user.open_orders_count} />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-navy-900 text-navy-900' : 'text-slate-500 hover:text-navy-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <Card>
          <CardHeader title="User Information" />
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Registration Date" value={formatDateTime(user.created_at)} />
            <Field label="Last Login" value={user.last_login_at ? formatDateTime(user.last_login_at) : '—'} />
            <Field label="Account Currency" value={user.currency} />
            <Field label="Username" value={`@${user.username}`} />
          </dl>
        </Card>
      )}

      {tab === 'Accounts' && (
        <Card>
          <CardHeader
            title="Trading accounts"
            subtitle="Leverage and promotional funds are set here — the account holder cannot change either."
          />
          <div className="mt-4">
            <AccountLeverageControls userId={user.id} />
          </div>
        </Card>
      )}

      {tab === 'Live Positions' && (
        <Card>
          <CardHeader
            title="Live Open Positions"
            subtitle="Real-time profit/loss manipulation controls for each position"
          />
          {livePositions.length === 0 ? (
            <EmptyState title="No open positions" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4">Asset</th>
                    <th className="py-2 pr-4">Quantity</th>
                    <th className="py-2 pr-4">Entry Price</th>
                    <th className="py-2 pr-4">Current Price</th>
                    <th className="py-2 pr-4">Current Value</th>
                    <th className="py-2 pr-4">P&L</th>
                    <th className="py-2 pr-4">P&L %</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {livePositions.map((position) => {
                    const pnl = Number(position.unrealized_profit_loss)
                    const pnlPct = Number(position.unrealized_profit_loss_pct)
                    return (
                      <tr key={position.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-4 font-semibold text-navy-900">{position.symbol}</td>
                        <td className="py-3 pr-4 tabular-nums text-navy-800">{position.quantity}</td>
                        <td className="py-3 pr-4 tabular-nums text-navy-800">{formatCurrency(position.average_entry_price)}</td>
                        <td className="py-3 pr-4 tabular-nums text-navy-800">{formatCurrency(position.current_market_price)}</td>
                        <td className="py-3 pr-4 tabular-nums text-navy-800">{formatCurrency(position.current_market_value)}</td>
                        <td className={`py-3 pr-4 tabular-nums font-semibold ${pnl >= 0 ? 'text-gain-600' : 'text-loss-600'}`}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </td>
                        <td className={`py-3 pr-4 tabular-nums font-semibold ${pnlPct >= 0 ? 'text-gain-600' : 'text-loss-600'}`}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                        </td>
                        <td className="py-3 pr-4">
                          <PositionManipulationControls
                            position={position}
                            onManipulated={loadLivePositions}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'Trading Activity' && (
        <div className="space-y-6">
          <RecordsTable title="Open Orders" rows={profile.open_orders} columns={['symbol', 'side', 'order_type', 'quantity', 'status']} />
          <RecordsTable title="Trade History" rows={profile.trade_history} columns={['symbol', 'side', 'quantity', 'execution_price', 'total_value', 'executed_at']} />
          <RecordsTable title="Position History" rows={profile.position_history} columns={['symbol', 'quantity', 'average_entry_price', 'status', 'opened_at']} />
        </div>
      )}

      {tab === 'Transactions' && (
        <RecordsTable title="Ledger Entries" rows={profile.ledger_entries} columns={['transaction_type', 'amount', 'balance_before', 'balance_after', 'description', 'created_at']} />
      )}

      {tab === 'Admin Controls' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Admin-Managed Account Override" subtitle="Manually set the values shown on this user's dashboard." />
            <FinancialSettingsForm userId={userId} currency={user.currency} onSaved={reload} />
          </Card>
          <Card>
            <CardHeader title="Balance Adjustment" subtitle="Every adjustment writes an immutable ledger entry." />
            <BalanceAdjustmentForm userId={userId} onSaved={reload} />
          </Card>
        </div>
      )}

      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title={`Adjust Balance — ${user.full_name}`}>
        <BalanceAdjustmentForm userId={userId} onSaved={() => { reload(); setAdjustModalOpen(false) }} />
      </Modal>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-navy-900">{value}</dd>
    </div>
  )
}

function RecordsTable({ title, rows, columns }: { title: string; rows: Record<string, unknown>[]; columns: string[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <EmptyState title="No records" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                {columns.map((c) => (
                  <th key={c} className="py-2 pr-4">{c.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  {columns.map((c) => (
                    <td key={c} className="py-2.5 pr-4 tabular-nums text-navy-800">{String(row[c] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function AdminUserDetailPage() {
  return (
    <Suspense>
      <UserFinancialProfile />
    </Suspense>
  )
}
