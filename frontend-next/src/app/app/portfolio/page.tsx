'use client'

import { useEffect, useMemo, useState } from 'react'

import { AllocationDonut, allocationColor } from '@/components/charts/AllocationDonut'
import { PortfolioAreaChart } from '@/components/charts/PortfolioAreaChart'
import { Badge } from '@/components/common/Badge'
import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PnLText } from '@/components/common/PnLText'
import { Skeleton } from '@/components/common/Spinner'
import { LivePositionsTable } from '@/components/trading/LivePositionsTable'
import { useAccountStore } from '@/store/accountStore'
import { useAccountsStore } from '@/store/accountsStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { usePositionsStore } from '@/store/positionsStore'
import type { Position } from '@/types/trading'
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/format'
import { signedLedgerAmount } from '@/lib/ledger'

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'] as const

function buildSyntheticHistory(currentValue: number): { time: number; value: number }[] {
  const now = Math.floor(Date.now() / 1000)
  const points = []
  let value = currentValue * 0.92
  for (let i = 90; i >= 0; i--) {
    const drift = (Math.random() - 0.47) * 0.012
    value = i === 0 ? currentValue : value * (1 + drift)
    points.push({ time: now - i * 3600, value: Math.max(value, 0) })
  }
  return points
}

/** Open trades' unrealised P&L and the amount invested in them, from the
 * positions list — already scoped to the selected account, so demo and real
 * stay apart. */
function openPnl(positions: Position[]): { unrealized: number; invested: number } {
  let unrealized = 0
  let invested = 0
  for (const p of positions) {
    if (p.status !== 'open') continue
    unrealized += Number(p.unrealized_profit_loss)
    invested += Number(p.total_cost_basis)
  }
  return { unrealized, invested }
}

export default function PortfolioPage() {
  const summary = usePortfolioStore((s) => s.summary)
  const transactions = useAccountStore((s) => s.transactions)
  const fetchTransactions = useAccountStore((s) => s.fetchTransactions)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const activeAccount = useAccountsStore((s) => s.accounts.find((a) => a.id === s.activeAccountId))
  const positions = usePositionsStore((s) => s.positions)
  const [range, setRange] = useState<(typeof RANGES)[number]>('1M')

  // Reloads on an account switch so this page shows the selected account's
  // activity, not the previous one's.
  useEffect(() => {
    if (activeAccountId) fetchTransactions().catch(() => undefined)
  }, [activeAccountId, fetchTransactions])

  const history = useMemo(() => buildSyntheticHistory(Number(summary?.total_portfolio_value ?? 0)), [summary?.total_portfolio_value, range])
  const live = useMemo(() => openPnl(positions), [positions])

  if (!summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  // The summary is refetched on each price tick but reads the previous tick's
  // figures, so open-trade P&L comes from the positions, which update live.
  // Admin-managed figures are set by an admin and are shown as given.
  const isAdminManaged = summary.data_source === 'admin_managed'
  const unrealizedPnl = isAdminManaged ? summary.total_unrealized_profit_loss : live.unrealized
  const totalPnl = isAdminManaged
    ? summary.total_profit_loss
    : Number(summary.total_realized_profit_loss) + live.unrealized
  const totalPnlPct = isAdminManaged
    ? summary.total_profit_loss_pct
    : live.invested ? (live.unrealized / live.invested) * 100 : 0
  const isPositiveTotal = Number(totalPnl) >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {/* Names the account these figures belong to: demo and real each have
              their own portfolio, and nothing else on the page says which. */}
          {activeAccount && (
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={activeAccount.account_type === 'demo' ? 'neutral' : 'gain'} className="uppercase">
                {activeAccount.account_type === 'demo' ? 'Demo account' : 'Real account'}
              </Badge>
              <span className="font-mono text-xs text-slate-500">{activeAccount.account_number}</span>
            </div>
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Portfolio Value</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums text-navy-900">{formatCurrency(summary.total_portfolio_value, summary.currency)}</p>
        </div>
        {summary.data_source === 'admin_managed' && <Badge tone="gold">Admin-managed account</Badge>}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <PnLText value={totalPnl} size="lg" />
            <PnLText value={totalPnlPct} mode="percent" size="lg" />
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
        <PortfolioAreaChart data={history} positive={isPositiveTotal} height={300} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Asset Allocation" />
          {summary.allocation.length === 0 ? (
            <EmptyState title="No holdings" description="Buy an asset from the trading terminal to see allocation." />
          ) : (
            <div className="flex items-center gap-6">
              <AllocationDonut slices={summary.allocation.map((a) => ({ label: a.symbol, percentage: Number(a.percentage) }))} />
              <div className="flex-1 space-y-2.5">
                {summary.allocation.map((a, i) => (
                  <div key={a.symbol} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-navy-700">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: allocationColor(i) }} />
                      {a.name}
                    </span>
                    <span className="font-medium tabular-nums text-navy-900">{formatPercent(a.percentage, { signed: false })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Balance Breakdown" />
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Available Cash', formatCurrency(summary.available_cash_balance, summary.currency)],
              ['Locked Balance', formatCurrency(summary.locked_balance, summary.currency)],
              ['Crypto Assets', formatCurrency(summary.value_of_crypto_assets, summary.currency)],
              ['Unrealized P&L', formatCurrency(unrealizedPnl, summary.currency)],
              ['Realized P&L', formatCurrency(summary.total_realized_profit_loss, summary.currency)],
              ['Total P&L', formatCurrency(totalPnl, summary.currency)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 font-semibold tabular-nums text-navy-900">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Assets" />
        <LivePositionsTable linkPrefix="/app/markets" />
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
                    <td className="py-2.5"><Badge tone="neutral">{tx.transaction_type.replace(/_/g, ' ')}</Badge></td>
                    <td className="py-2.5 text-slate-500">{tx.description ?? '—'}</td>
                    <td className="py-2.5"><PnLText value={signedLedgerAmount(tx)} currency={tx.currency} /></td>
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
