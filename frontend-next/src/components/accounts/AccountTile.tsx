'use client'

import { PnLText } from '@/components/common/PnLText'
import type { TradingAccount } from '@/types/account'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

/** A selectable account tile.
 *
 * Equity leads because it is the number that actually moves — balance is the
 * settled figure behind it. The margin bar is only drawn when something is
 * open, so an idle account reads as calm rather than as a gauge pinned at zero.
 */
export function AccountTile({
  account,
  isActive,
  onSelect,
}: {
  account: TradingAccount
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const isDemo = account.account_type === 'demo'
  const level = account.margin_level === null ? null : Number(account.margin_level)
  // Full bar at 1000%+ and empty at stop-out, so the healthy range is legible
  // rather than compressed into the last pixel.
  const gauge = level === null ? 0 : Math.max(0, Math.min(100, (level / 1000) * 100))

  return (
    <button
      type="button"
      onClick={() => onSelect(account.id)}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all',
        isActive
          ? 'border-transparent bg-navy-950 shadow-lg ring-2 ring-accent-500'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
      )}
    >
      {/* Type stripe — a glance tells you demo from real before reading. */}
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          isDemo ? 'bg-slate-300' : 'bg-gradient-to-r from-gain-500 to-accent-500',
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('font-mono text-base font-bold tracking-tight', isActive ? 'text-white' : 'text-navy-900')}>
            {account.account_number}
          </p>
          <p className={cn('mt-0.5 truncate text-xs', isActive ? 'text-slate-400' : 'text-slate-500')}>
            {account.label || (isDemo ? 'Practice account' : 'Live account')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              isDemo ? 'bg-slate-100 text-slate-600' : 'bg-gain-500/15 text-gain-600',
              isActive && isDemo && 'bg-white/10 text-slate-300',
              isActive && !isDemo && 'bg-gain-500/20 text-gain-400',
            )}
          >
            {account.account_type}
          </span>
          <span className={cn('text-[10px] font-semibold', isActive ? 'text-slate-400' : 'text-slate-400')}>
            1:{account.leverage}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className={cn('text-[10px] font-medium uppercase tracking-wider', isActive ? 'text-slate-500' : 'text-slate-400')}>
          Equity
        </p>
        <p className={cn('font-display text-2xl font-bold tabular-nums', isActive ? 'text-white' : 'text-navy-900')}>
          {formatCurrency(account.equity, account.currency)}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <PnLText value={account.total_pnl} size="sm" />
          <span className={isActive ? 'text-slate-500' : 'text-slate-400'}>all time</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs"
           style={{ borderColor: isActive ? 'rgba(255,255,255,0.1)' : undefined }}>
        <Mini label="Balance" value={formatCurrency(account.balance, account.currency)} dark={isActive} />
        <Mini label="Free" value={formatCurrency(account.free_margin, account.currency)} dark={isActive} />
        <Mini label="Withdraw" value={formatCurrency(account.withdrawable, account.currency)} dark={isActive} />
      </div>

      {account.open_positions > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className={isActive ? 'text-slate-400' : 'text-slate-500'}>
              {account.open_positions} open · margin level {level?.toFixed(0)}%
            </span>
            {account.stop_out ? (
              <span className="font-bold text-loss-500">STOP-OUT</span>
            ) : account.margin_call ? (
              <span className="font-bold text-amber-500">MARGIN CALL</span>
            ) : null}
          </div>
          <div className={cn('mt-1 h-1.5 overflow-hidden rounded-full', isActive ? 'bg-white/10' : 'bg-slate-100')}>
            <div
              className={cn(
                'h-full rounded-full transition-all',
                account.stop_out ? 'bg-loss-500' : account.margin_call ? 'bg-amber-500' : 'bg-gain-500',
              )}
              style={{ width: `${gauge}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

function Mini({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn('text-[9px] font-medium uppercase tracking-wider', dark ? 'text-slate-500' : 'text-slate-400')}>
        {label}
      </p>
      <p className={cn('truncate text-xs font-semibold tabular-nums', dark ? 'text-slate-200' : 'text-navy-800')}>
        {value}
      </p>
    </div>
  )
}
