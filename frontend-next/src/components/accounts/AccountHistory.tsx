'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PnLText } from '@/components/common/PnLText'
import { Spinner } from '@/components/common/Spinner'
import { useAccountsStore } from '@/store/accountsStore'
import type { TradingAccount } from '@/types/account'
import type { Order, Position } from '@/types/trading'
import type { LedgerEntry } from '@/types/wallet'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'

const TABS = ['Transactions', 'Orders', 'Positions'] as const

/** Per-account history. Each account keeps its own books, so these read from
 * the account's own ledger and trade records rather than the user's combined
 * activity — which is the whole point of holding separate accounts. */
export function AccountHistory({ account }: { account: TradingAccount }) {
  const fetchTransactions = useAccountsStore((s) => s.fetchTransactions)
  const fetchOrders = useAccountsStore((s) => s.fetchOrders)
  const fetchPositions = useAccountsStore((s) => s.fetchPositions)

  const [tab, setTab] = useState<(typeof TABS)[number]>('Transactions')
  // Tagged with the account it belongs to, so switching accounts invalidates
  // it by comparison rather than by clearing state on the way in — which would
  // mean three synchronous resets inside the effect.
  const [loaded, setLoaded] = useState<{
    accountId: string
    ledger: LedgerEntry[]
    orders: Order[]
    positions: Position[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchTransactions(account.id).catch(() => [] as LedgerEntry[]),
      fetchOrders(account.id).catch(() => [] as Order[]),
      fetchPositions(account.id).catch(() => [] as Position[]),
    ]).then(([ledger, orders, positions]) => {
      if (!cancelled) setLoaded({ accountId: account.id, ledger, orders, positions })
    })
    return () => {
      cancelled = true
    }
  }, [account.id, fetchTransactions, fetchOrders, fetchPositions])

  const fresh = loaded?.accountId === account.id ? loaded : null
  const ledger = fresh?.ledger ?? null
  const orders = fresh?.orders ?? null
  const positions = fresh?.positions ?? null

  const counts: Record<(typeof TABS)[number], number | null> = {
    Transactions: ledger?.length ?? null,
    Orders: orders?.length ?? null,
    Positions: positions?.length ?? null,
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-b-2 border-navy-900 text-navy-900' : 'text-slate-500 hover:text-navy-800',
            )}
          >
            {t}
            {counts[t] !== null && (
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold tabular-nums text-slate-500">
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'Transactions' && (
          <Table
            rows={ledger}
            columns={['Type', 'Amount', 'Balance after', 'Description', 'Date']}
            empty="No transactions on this account yet."
            render={(t: LedgerEntry) => (
              <>
                <Cell><Badge tone="neutral" className="capitalize">{String(t.transaction_type).replace(/_/g, ' ')}</Badge></Cell>
                <Cell><PnLText value={t.amount} size="sm" /></Cell>
                <Cell>{formatCurrency(t.balance_after)}</Cell>
                <Cell className="max-w-[240px] truncate text-slate-500">{t.description || '—'}</Cell>
                <Cell className="text-xs">{formatDateTime(t.created_at)}</Cell>
              </>
            )}
          />
        )}

        {tab === 'Orders' && (
          <Table
            rows={orders}
            columns={['Symbol', 'Side', 'Type', 'Quantity', 'Filled', 'Status', 'Date']}
            empty="No orders placed on this account yet."
            render={(o: Order) => (
              <>
                <Cell className="font-semibold">{o.symbol}</Cell>
                <Cell><Badge tone={o.side === 'buy' ? 'gain' : 'loss'}>{o.side}</Badge></Cell>
                <Cell className="capitalize text-slate-500">{o.order_type.replace('_', ' ')}</Cell>
                <Cell>{formatNumber(o.quantity)}</Cell>
                <Cell>{o.filled_price ? formatCurrency(o.filled_price) : '—'}</Cell>
                <Cell><Badge tone={o.status === 'filled' ? 'gain' : 'neutral'}>{o.status}</Badge></Cell>
                <Cell className="text-xs">{formatDateTime(o.created_at)}</Cell>
              </>
            )}
          />
        )}

        {tab === 'Positions' && (
          <Table
            rows={positions}
            columns={['Symbol', 'Status', 'Qty', 'Entry', 'Exit', 'Leverage', 'P&L', 'Opened']}
            empty="No positions on this account yet."
            render={(p: Position) => (
              <>
                <Cell className="font-semibold">{p.symbol}</Cell>
                <Cell>
                  <Badge tone={p.status === 'open' ? 'accent' : 'neutral'}>{p.status}</Badge>
                </Cell>
                <Cell>{formatNumber(p.quantity)}</Cell>
                <Cell>{formatCurrency(p.average_entry_price)}</Cell>
                <Cell>{p.closing_price ? formatCurrency(p.closing_price) : '—'}</Cell>
                <Cell className="text-slate-500">1:{p.leverage ?? 1}</Cell>
                <Cell>
                  <PnLText value={p.status === 'closed' ? (p.realized_profit_loss ?? '0') : p.unrealized_profit_loss} size="sm" />
                </Cell>
                <Cell className="text-xs">{formatDateTime(p.opened_at)}</Cell>
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}

function Table<T extends { id: string }>({
  rows,
  columns,
  render,
  empty,
}: {
  rows: T[] | null
  columns: string[]
  render: (row: T) => React.ReactNode
  empty: string
}) {
  if (rows === null) return <Spinner />
  if (rows.length === 0) return <EmptyState title={empty} />
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
            <tr key={row.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60">
              {render(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('py-2.5 pr-4 tabular-nums text-navy-800', className)}>{children}</td>
}
