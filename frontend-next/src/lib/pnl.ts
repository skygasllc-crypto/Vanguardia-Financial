import type { Position } from '@/types/trading'

const DAY_MS = 24 * 60 * 60 * 1000

/** Today's P&L worked out from the positions themselves, so it moves with every
 * price tick instead of waiting for a trade to close: open trades' unrealised
 * P&L plus the result of trades closed in the last 24 hours.
 *
 * Pass the positions store's list, which is already scoped to the selected
 * account, so demo and real stay apart. */
export function todaysPnl(positions: Position[]): number {
  const since = Date.now() - DAY_MS
  let total = 0
  for (const p of positions) {
    if (p.status === 'open') {
      total += Number(p.unrealized_profit_loss)
    } else if (p.closed_at && new Date(p.closed_at).getTime() >= since) {
      total += Number(p.realized_profit_loss ?? 0)
    }
  }
  return total
}
