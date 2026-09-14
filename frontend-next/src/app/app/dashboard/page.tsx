'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { AllocationDonut, allocationColor } from '@/components/charts/AllocationDonut'
import { PortfolioAreaChart } from '@/components/charts/PortfolioAreaChart'
import { AccountSwitcher } from '@/components/accounts/AccountSwitcher'
import { Badge } from '@/components/common/Badge'
import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PnLText } from '@/components/common/PnLText'
import { useAccountsStore } from '@/store/accountsStore'
import { Skeleton } from '@/components/common/Spinner'
import { StatCard } from '@/components/common/StatCard'
import { useAccountStore } from '@/store/accountStore'
import { useAccountTypeStore } from '@/store/accountTypeStore'
import { useAuthStore } from '@/store/authStore'
import { useMarketStore } from '@/store/marketStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useWatchlistStore } from '@/store/watchlistStore'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'

const RANGES = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const

function buildSyntheticHistory(currentValue: number): { time: number; value: number }[] {
  const now = Math.floor(Date.now() / 1000)
  const points = []
  let value = currentValue * 0.94
  for (let i = 60; i >= 0; i--) {
    const drift = (Math.random() - 0.48) * 0.01
    value = i === 0 ? currentValue : value * (1 + drift)
    points.push({ time: now - i * 3600, value: Math.max(value, 0) })
  }
  return points
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const summary = usePortfolioStore((s) => s.summary)
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts)
  const assets = useMarketStore((s) => s.assets)
  const watchlist = useWatchlistStore((s) => s.items)
  const transactions = useAccountStore((s) => s.transactions)
  const fetchTransactions = useAccountStore((s) => s.fetchTransactions)
  const accountType = useAccountTypeStore((s) => s.accountType)
  const [range, setRange] = useState<(typeof RANGES)[number]>('1M')

  useEffect(() => {
    fetchTransactions().catch(() => undefined)
  }, [fetchTransactions])

  // Refetch whenever the selected account changes, so the figures follow the
  // account switcher rather than staying on whichever one loaded first.
  useEffect(() => {
    fetchAccounts().catch(() => undefined)
  }, [fetchAccounts])

  useEffect(() => {
    fetchPortfolio(accountType, activeAccountId ?? undefined).catch(() => undefined)
  }, [accountType, activeAccountId, fetchPortfolio])

  const history = useMemo(() => buildSyntheticHistory(Number(summary?.total_portfolio_value ?? 0)), [summary?.total_portfolio_value, range])

  const topMovers = useMemo(
    () => Object.values(assets).sort((a, b) => Math.abs(Number(b.change_24h_pct)) - Math.abs(Number(a.change_24h_pct))).slice(0, 5),
    [assets],
  )

  if (!summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const isPositiveTotal = Number(summary.total_profit_loss) >= 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-900">
            Welcome back, {user?.full_name?.split(' ')[0] ?? 'Investor'}
          </h2>
          <p className="text-sm text-slate-500">Here&apos;s how your portfolio is performing.</p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher />
          {summary.data_source === 'admin_managed' && <Badge tone="gold">Admin-managed</Badge>}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Portfolio Value</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums text-navy-900">{formatCurrency(summary.total_portfolio_value, summary.currency)}</p>
            <div className="mt-2 flex items-center gap-2">
              <PnLText value={summary.daily_profit_loss} />
              <PnLText value={summary.daily_profit_loss_pct} mode="percent" />
              <span className="text-sm text-slate-400">Today</span>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === r ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <PortfolioAreaChart data={history} positive={isPositiveTotal} height={280} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Available Cash" value={formatCurrency(summary.available_cash_balance, summary.currency)} />
        <StatCard label="Crypto Assets" value={formatCurrency(summary.value_of_crypto_assets, summary.currency)} />
        <StatCard label="Unrealized P&L" value={<PnLText value={summary.total_unrealized_profit_loss} />} />
        <StatCard label="Realized P&L" value={<PnLText value={summary.total_realized_profit_loss} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Portfolio Allocation" />
          {summary.allocation.length === 0 ? (
            <EmptyState title="No holdings yet" description="Buy your first asset to see your allocation here." />
          ) : (
            <div className="flex items-center gap-6">
              <AllocationDonut slices={summary.allocation.map((a) => ({ label: a.symbol, percentage: Number(a.percentage) }))} />
              <div className="flex-1 space-y-2.5">
                {summary.allocation.map((a, i) => (
                  <div key={a.symbol} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-navy-700">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: allocationColor(i) }} />
                      {a.symbol}
                    </span>
                    <span className="font-medium tabular-nums text-navy-900">{formatPercent(a.percentage, { signed: false })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Top Assets" action={<Link href="/app/portfolio" className="text-xs font-semibold text-accent-600">View all</Link>} />
          {summary.positions.length === 0 ? (
            <EmptyState title="No positions" description="Your open positions will appear here." />
          ) : (
            <div className="space-y-3">
              {summary.positions.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{p.symbol}</p>
                    <p className="text-xs text-slate-500">{formatNumber(p.quantity)} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-navy-900">{formatCurrency(p.current_market_value)}</p>
                    <PnLText value={p.unrealized_profit_loss_pct} mode="percent" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Top Market Movers" action={<Link href="/app/markets" className="text-xs font-semibold text-accent-600">Markets</Link>} />
          {topMovers.length === 0 ? (
            <EmptyState title="No market data yet" />
          ) : (
            <div className="space-y-3">
              {topMovers.map((asset) => (
                <Link key={asset.symbol} href={`/app/markets/asset?symbol=${asset.symbol}`} className="flex items-center justify-between hover:opacity-70">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{asset.symbol}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(asset.current_price)}</p>
                  </div>
                  <PnLText value={asset.change_24h_pct} mode="percent" size="sm" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Transactions" action={<Link href="/app/wallet" className="text-xs font-semibold text-accent-600">View wallet</Link>} />
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Your trades and balance changes will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Balance After</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0">
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

      <Card>
        <CardHeader title="Watchlist" action={<Link href="/app/watchlist" className="text-xs font-semibold text-accent-600">Manage watchlist</Link>} />
        {watchlist.length === 0 ? (
          <EmptyState title="Your watchlist is empty" description="Add assets from the Markets page to track them here." action={<Link href="/app/markets" className="text-sm font-semibold text-accent-600">Browse markets</Link>} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {watchlist.map((item) => (
              <Link key={item.id} href={`/app/markets/asset?symbol=${item.asset.symbol}`} className="rounded-xl border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50">
                <p className="text-sm font-semibold text-navy-900">{item.asset.symbol}</p>
                <p className="mt-1 text-sm tabular-nums text-navy-800">{formatCurrency(item.asset.current_price)}</p>
                <PnLText value={item.asset.change_24h_pct} mode="percent" size="sm" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
