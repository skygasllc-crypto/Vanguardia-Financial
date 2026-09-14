'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { PnLText } from '@/components/common/PnLText'
import { useAccountsStore } from '@/store/accountsStore'
import { useOrdersStore } from '@/store/ordersStore'
import { usePositionsStore } from '@/store/positionsStore'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'

const TABS = ['Open Orders', 'Order History', 'Executions'] as const

const statusTone: Record<string, 'neutral' | 'gain' | 'loss' | 'accent'> = {
  open: 'accent', pending: 'accent', filled: 'gain', cancelled: 'neutral', rejected: 'loss', partially_filled: 'accent',
}

export function OrdersHistoryPanel() {
  const orders = useOrdersStore((s) => s.orders)
  const trades = useOrdersStore((s) => s.trades)
  const fetchOrders = useOrdersStore((s) => s.fetchOrders)
  const fetchTrades = useOrdersStore((s) => s.fetchTrades)
  const cancelOrder = useOrdersStore((s) => s.cancelOrder)
  const positions = usePositionsStore((s) => s.positions)
  const fetchPositions = usePositionsStore((s) => s.fetchPositions)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Open Orders')

  // Re-reads on every account switch: each account is a separate book, and
  // leaving the previous one on screen misreports what the user holds.
  useEffect(() => {
    if (!activeAccountId) return
    fetchOrders().catch(() => undefined)
    fetchTrades().catch(() => undefined)
    fetchPositions().catch(() => undefined)
  }, [activeAccountId, fetchOrders, fetchTrades, fetchPositions])

  // Order history is reported per position rather than per order: a "trade"
  // as a user thinks of it has an entry, an exit and a result, and an order
  // record alone has no closing side to report.
  const history = useMemo(
    () =>
      [...positions].sort((a, b) => {
        const at = new Date(a.closed_at ?? a.opened_at).getTime()
        const bt = new Date(b.closed_at ?? b.opened_at).getTime()
        return bt - at
      }),
    [positions],
  )

  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'pending')

  async function handleCancel(orderId: string) {
    try {
      await cancelOrder(orderId)
      toast.success('Order cancelled.')
    } catch {
      toast.error('Could not cancel order.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-100">
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

      {tab === 'Open Orders' &&
        (openOrders.length === 0 ? (
          <EmptyState title="No open orders" />
        ) : (
          <Table
            rows={openOrders}
            columns={['Symbol', 'Side', 'Type', 'Quantity', 'Price', 'Status', '']}
            render={(o) => (
              <>
                <Cell>{o.symbol}</Cell>
                <Cell><Badge tone={o.side === 'buy' ? 'gain' : 'loss'}>{o.side}</Badge></Cell>
                <Cell className="capitalize">{o.order_type.replace('_', ' ')}</Cell>
                <Cell>{formatNumber(o.quantity)}</Cell>
                <Cell>{o.price ? formatCurrency(o.price) : 'Market'}</Cell>
                <Cell><Badge tone={statusTone[o.status]}>{o.status}</Badge></Cell>
                <Cell align="right">
                  <Button size="sm" variant="danger" onClick={() => handleCancel(o.id)}>
                    Cancel
                  </Button>
                </Cell>
              </>
            )}
          />
        ))}

      {tab === 'Order History' &&
        (history.length === 0 ? (
          <EmptyState title="No trades yet" description="Positions you open and close will be reported here with entry, exit and result." />
        ) : (
          <Table
            rows={history}
            columns={['Symbol', 'Status', 'Entry', 'Exit', 'Profit Limit', 'Stop Limit', 'Opened', 'Closed', 'P&L']}
            render={(p) => {
              const isClosed = p.status === 'closed'
              return (
                <>
                  <Cell className="font-semibold">{p.symbol}</Cell>
                  <Cell>
                    <Badge tone={isClosed ? 'neutral' : 'accent'}>{isClosed ? 'Closed' : 'Open'}</Badge>
                  </Cell>
                  <Cell>{formatCurrency(p.average_entry_price)}</Cell>
                  <Cell>{p.closing_price ? formatCurrency(p.closing_price) : '—'}</Cell>
                  <Cell className="text-gain-600">
                    {p.take_profit_price ? formatCurrency(p.take_profit_price) : 'Not set'}
                  </Cell>
                  <Cell className="text-loss-600">
                    {p.stop_loss_price ? formatCurrency(p.stop_loss_price) : 'Not set'}
                  </Cell>
                  <Cell className="text-xs">{formatDateTime(p.opened_at)}</Cell>
                  <Cell className="text-xs">{p.closed_at ? formatDateTime(p.closed_at) : '—'}</Cell>
                  <Cell>
                    <PnLText
                      value={isClosed ? (p.realized_profit_loss ?? '0') : p.unrealized_profit_loss}
                      size="sm"
                    />
                  </Cell>
                </>
              )
            }}
          />
        ))}

      {tab === 'Executions' &&
        (trades.length === 0 ? (
          <EmptyState title="No trades yet" />
        ) : (
          <Table
            rows={trades}
            columns={['Symbol', 'Side', 'Quantity', 'Execution Price', 'Total Value', 'Realized P&L', 'Date']}
            render={(t) => (
              <>
                <Cell>{t.symbol}</Cell>
                <Cell><Badge tone={t.side === 'buy' ? 'gain' : 'loss'}>{t.side}</Badge></Cell>
                <Cell>{formatNumber(t.quantity)}</Cell>
                <Cell>{formatCurrency(t.execution_price)}</Cell>
                <Cell>{formatCurrency(t.total_value)}</Cell>
                <Cell>{t.realized_profit_loss ? formatCurrency(t.realized_profit_loss) : '—'}</Cell>
                <Cell>{formatDateTime(t.executed_at)}</Cell>
              </>
            )}
          />
        ))}
    </div>
  )
}

function Table<T extends { id: string }>({ rows, columns, render }: { rows: T[]; columns: string[]; render: (row: T) => ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
            {columns.map((c) => (
              <th key={c} className="py-2 pr-4">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0">
              {render(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ children, className, align }: { children: ReactNode; className?: string; align?: 'right' }) {
  return <td className={cn('py-2.5 pr-4 tabular-nums text-navy-800', align === 'right' && 'text-right', className)}>{children}</td>
}
