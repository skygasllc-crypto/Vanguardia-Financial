'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { PnLText } from '@/components/common/PnLText'
import { usePositionsStore } from '@/store/positionsStore'
import { toast } from '@/store/toastStore'
import type { Position } from '@/types/trading'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'

/** The live book. Closed positions are kept visible and clearly marked rather
 * than dropped, so closing a trade reads as a state change instead of a row
 * vanishing — and so a position closed in another tab or by an admin shows its
 * real state here. `showClosed` hides them once the user is done with them. */
export function LivePositionsTable({ linkPrefix = '/app/markets' }: { linkPrefix?: string }) {
  const positions = usePositionsStore((s) => s.positions)
  const closePosition = usePositionsStore((s) => s.closePosition)
  const [pendingClose, setPendingClose] = useState<Position | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [showClosed, setShowClosed] = useState(true)

  const openCount = useMemo(() => positions.filter((p) => p.status === 'open').length, [positions])
  const closedCount = positions.length - openCount
  const visible = useMemo(
    () => (showClosed ? positions : positions.filter((p) => p.status === 'open')),
    [positions, showClosed],
  )

  async function confirmClose() {
    if (!pendingClose) return
    setIsClosing(true)
    try {
      await closePosition(pendingClose.id)
      toast.success(`Closed ${pendingClose.symbol} position.`)
      setPendingClose(null)
    } catch {
      toast.error('Failed to close position. Please try again.')
    } finally {
      setIsClosing(false)
    }
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        title="No open positions"
        description="Positions you open from the trading terminal will appear here with live profit and loss."
      />
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-navy-800">{openCount}</span> open
          {closedCount > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-navy-800">{closedCount}</span> closed
            </>
          )}
        </p>
        {closedCount > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Show closed positions
          </label>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
              <th className="py-2.5 pr-4">Asset</th>
              <th className="py-2.5 pr-4">Quantity</th>
              <th className="py-2.5 pr-4">Entry Price</th>
              <th className="py-2.5 pr-4">Current / Exit</th>
              <th className="py-2.5 pr-4">Market Value</th>
              <th className="py-2.5 pr-4">Invested</th>
              <th className="py-2.5 pr-4">P&L</th>
              <th className="py-2.5 pr-4">P&L %</th>
              <th className="py-2.5 pr-4">Status</th>
              <th className="py-2.5 pr-4">Closed</th>
              <th className="py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const isClosed = p.status === 'closed'
              // A closed position's result is realised; showing the (now zero)
              // unrealised figure would report every closed trade as flat.
              const pl = isClosed ? (p.realized_profit_loss ?? '0') : p.unrealized_profit_loss
              return (
              <tr key={p.id} className={cn('border-b border-slate-50 last:border-0', isClosed && 'bg-slate-50/60 text-slate-500')}>
                <td className="py-3 pr-4">
                  <Link href={`${linkPrefix}/asset?symbol=${p.symbol}`} className="font-semibold text-navy-900 hover:text-accent-600">
                    {p.symbol}
                  </Link>
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-600">{formatNumber(p.quantity)}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-600">{formatCurrency(p.average_entry_price)}</td>
                <td className="py-3 pr-4 tabular-nums text-navy-900">
                  {formatCurrency(isClosed ? (p.closing_price ?? p.current_market_price) : p.current_market_price)}
                </td>
                <td className="py-3 pr-4 tabular-nums text-navy-900">{formatCurrency(p.current_market_value)}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-600">{formatCurrency(p.total_cost_basis)}</td>
                <td className="py-3 pr-4"><PnLText value={pl} size="sm" /></td>
                <td className="py-3 pr-4">
                  <PnLText
                    value={isClosed ? realizedPct(p) : p.unrealized_profit_loss_pct}
                    mode="percent"
                    size="sm"
                  />
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={isClosed ? 'neutral' : 'accent'}>{isClosed ? 'Closed' : 'Open'}</Badge>
                </td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-500">
                  {p.closed_at ? formatDateTime(p.closed_at) : '—'}
                </td>
                <td className="py-3 text-right">
                  {isClosed ? (
                    <span className="text-xs text-slate-400">Settled</span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setPendingClose(p)}>
                      Close
                    </Button>
                  )}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={pendingClose !== null}
        onClose={() => setPendingClose(null)}
        title={`Close ${pendingClose?.symbol} Position?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingClose(null)}>
              Cancel
            </Button>
            <Button variant="sell" onClick={confirmClose} isLoading={isClosing}>
              Close Position
            </Button>
          </>
        }
      >
        {pendingClose && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Market Price</span>
              <span className="font-medium tabular-nums text-navy-900">{formatCurrency(pendingClose.current_market_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quantity</span>
              <span className="font-medium tabular-nums text-navy-900">{formatNumber(pendingClose.quantity)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Estimated {Number(pendingClose.unrealized_profit_loss) >= 0 ? 'Profit' : 'Loss'}</span>
              <PnLText value={pendingClose.unrealized_profit_loss} />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/** Realised return as a percentage of what the position actually cost. */
function realizedPct(p: Position): string {
  const cost = Number(p.total_cost_basis)
  const realized = Number(p.realized_profit_loss ?? 0)
  if (!cost) return '0'
  return String((realized / cost) * 100)
}
