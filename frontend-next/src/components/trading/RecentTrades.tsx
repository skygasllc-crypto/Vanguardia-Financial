'use client'

import { useEffect, useState } from 'react'

import { formatCurrency, formatNumber } from '@/lib/format'

interface TradeRow {
  id: number
  price: number
  size: number
  side: 'buy' | 'sell'
  time: string
}

/** Illustrative "recent market trades" tape, synthesized client-side from
 * the live market price — see the note in OrderBook.tsx for why. */
export function RecentTrades({ currentPrice }: { currentPrice: number }) {
  const [trades, setTrades] = useState<TradeRow[]>([])

  useEffect(() => {
    if (currentPrice <= 0) return
    setTrades((prev) => {
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell'
      const price = currentPrice * (1 + (Math.random() - 0.5) * 0.0008)
      const next: TradeRow = { id: Date.now(), price, size: 0.01 + Math.random() * 1.5, side, time: new Date().toLocaleTimeString() }
      return [next, ...prev].slice(0, 20)
    })
  }, [currentPrice])

  return (
    <div className="text-xs">
      <div className="mb-1.5 grid grid-cols-3 px-1 text-slate-500">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto scrollbar-thin">
        {trades.map((t) => (
          <div key={t.id} className="grid grid-cols-3 px-1 py-0.5">
            <span className={`tabular-nums ${t.side === 'buy' ? 'text-gain-500' : 'text-loss-500'}`}>{formatCurrency(t.price)}</span>
            <span className="text-right tabular-nums text-slate-300">{formatNumber(t.size, 3)}</span>
            <span className="text-right tabular-nums text-slate-500">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
