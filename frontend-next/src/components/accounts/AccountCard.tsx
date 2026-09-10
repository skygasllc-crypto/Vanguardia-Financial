'use client'

import { Badge } from '@/components/common/Badge'
import { PnLText } from '@/components/common/PnLText'
import type { TradingAccount } from '@/types/account'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

interface AccountCardProps {
  account: TradingAccount
  isActive?: boolean
  onSelect?: (id: string) => void
  compact?: boolean
}

/** One account's headline figures.
 *
 * Balance and equity are shown together because they diverge as soon as a
 * position is open, and the difference is the whole point: balance is settled
 * cash, equity is what the account is worth marked to market. */
export function AccountCard({ account, isActive = false, onSelect, compact = false }: AccountCardProps) {
  const isDemo = account.account_type === 'demo'
  // `bonus` is the API field name; the user-facing term is "credits".
  const hasCredits = Number(account.bonus) > 0

  return (
    <button
      type="button"
      onClick={() => onSelect?.(account.id)}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-colors',
        isActive ? 'border-accent-500 bg-accent-50/40 ring-1 ring-accent-500/30' : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-navy-900">{account.account_number}</span>
            <Badge tone={isDemo ? 'neutral' : 'gain'} className="uppercase">
              {account.account_type}
            </Badge>
            {account.is_primary && <Badge tone="accent">Primary</Badge>}
            <Badge tone="neutral" className="!bg-slate-100 !text-slate-600">1:{account.leverage}</Badge>
          </div>
          {account.label && <p className="mt-1 truncate text-xs text-slate-500">{account.label}</p>}
        </div>

        {/* Only shown when there is an actual margin problem — margin_level is
            null with nothing open, which must not read as a warning. */}
        {account.stop_out ? (
          <Badge tone="loss">Stop-out</Badge>
        ) : account.margin_call ? (
          <Badge tone="warning">Margin call</Badge>
        ) : null}
      </div>

      <div className={cn('mt-4 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        <Figure label="Balance" value={formatCurrency(account.balance, account.currency)} />
        <Figure label="Equity" value={formatCurrency(account.equity, account.currency)} strong />
        <Figure
          label="Withdrawable"
          value={formatCurrency(account.withdrawable, account.currency)}
          hint={hasCredits ? `excl. ${formatCurrency(account.bonus, account.currency)} credits` : undefined}
        />
        <Figure label="Free margin" value={formatCurrency(account.free_margin, account.currency)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          {account.open_positions} open · margin {formatCurrency(account.margin_used, account.currency)}
          {account.margin_level !== null && ` · level ${Number(account.margin_level).toFixed(0)}%`}
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500">P&amp;L</span>
          <PnLText value={account.total_pnl} size="sm" />
        </span>
      </div>
    </button>
  )
}

function Figure({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-0.5 truncate tabular-nums', strong ? 'text-base font-semibold text-navy-900' : 'text-sm text-navy-800')}>
        {value}
      </p>
      {hint && <p className="truncate text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}
