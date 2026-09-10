'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { StatCard } from '@/components/common/StatCard'
import { usePositionsStore } from '@/store/positionsStore'
import { useAccountStore } from '@/store/accountStore'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'

export default function WalletPage() {
  const wallet = useAccountStore((s) => s.wallet)
  const transactions = useAccountStore((s) => s.transactions)
  const fetchTransactions = useAccountStore((s) => s.fetchTransactions)
  const positions = usePositionsStore((s) => s.positions)

  useEffect(() => {
    fetchTransactions().catch(() => undefined)
  }, [fetchTransactions])

  return (
    <div className="space-y-6">
      {/* Header with Add Funds Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-sm text-slate-600">Manage your account balance and transactions</p>
        </div>
        <Link href="/app/wallet/add-funds">
          <Button variant="primary" size="lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Funds
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available Balance" value={formatCurrency(wallet?.available_balance ?? 0, wallet?.currency)} />
        <StatCard label="Locked Balance" value={formatCurrency(wallet?.locked_balance ?? 0, wallet?.currency)} />
        <StatCard label="Currency" value={wallet?.currency ?? 'USD'} />
      </div>

      <Card>
        <CardHeader title="Asset Balances" />
        {positions.length === 0 ? (
          <EmptyState title="No asset balances" description="Assets you buy will show their held balance here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Asset</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">Market Value</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-medium text-navy-900">{p.symbol}</td>
                    <td className="py-2.5 tabular-nums text-slate-600">{formatNumber(p.quantity)}</td>
                    <td className="py-2.5 tabular-nums text-navy-900">{formatCurrency(p.current_market_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Transaction History" />
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Balance After</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-mono text-xs text-slate-400">{tx.transaction_ref}</td>
                    <td className="py-2.5"><Badge tone="neutral">{tx.transaction_type.replace(/_/g, ' ')}</Badge></td>
                    <td className="py-2.5 text-slate-500">{tx.description ?? '—'}</td>
                    <td className="py-2.5 font-medium tabular-nums text-navy-900">{formatCurrency(tx.amount, tx.currency)}</td>
                    <td className="py-2.5 tabular-nums text-slate-600">{formatCurrency(tx.balance_after, tx.currency)}</td>
                    <td className="py-2.5 text-slate-400">{formatDateTime(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
