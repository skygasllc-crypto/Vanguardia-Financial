'use client'

import { type ReactNode, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { PnLText } from '@/components/common/PnLText'
import { LivePositionsTable } from '@/components/trading/LivePositionsTable'
import { OrdersHistoryPanel } from '@/components/trading/OrdersHistoryPanel'
import { usePortfolioStore } from '@/store/portfolioStore'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

const TABS = ['Live Positions', 'Orders & History'] as const

/** The account/portfolio strip beneath the trading workspace — a WebTrader
 * "Portfolio" panel: balance summary + Buy/Sell entry point on top, live
 * positions and order/trade history in a single unified panel below. */
export function TradingPortfolioPanel({ onPlaceOrder }: { onPlaceOrder: () => void }) {
  const summary = usePortfolioStore((s) => s.summary)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Live Positions')

  const isAdminManaged = summary?.data_source === 'admin_managed'

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-navy-950 px-5 py-4 sm:rounded-t-2xl">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Portfolio</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge tone={isAdminManaged ? 'warning' : 'neutral'} className={isAdminManaged ? undefined : '!bg-white/10 !text-slate-200'}>
                {isAdminManaged ? 'Admin-managed' : 'Active'}
              </Badge>
            </div>
          </div>
          <AccountStat label="Equity" value={formatCurrency(summary?.total_portfolio_value ?? 0)} />
          <AccountStat label="Today's P&L" value={<PnLText value={summary?.daily_profit_loss ?? 0} size="sm" />} />
          <AccountStat label="Free" value={formatCurrency(summary?.available_cash_balance ?? 0)} />
        </div>
        <Button variant="buy" size="sm" onClick={onPlaceOrder}>
          Buy / Sell
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-b-2 border-navy-900 text-navy-900' : 'text-slate-500 hover:text-navy-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'Live Positions' ? <LivePositionsTable /> : <OrdersHistoryPanel />}
      </div>
    </div>
  )
}

function AccountStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-white">{value}</div>
    </div>
  )
}
