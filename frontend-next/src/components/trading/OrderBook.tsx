'use client'

import { useMemo } from 'react'

import { formatCurrency, formatNumber } from '@/lib/format'

interface OrderBookRow {
  price: number
  size: number
}

/** A visually authentic, illustrative order book. This platform runs as a
 * trading engine with no shared market-wide order flow, so
 * depth is synthesized around the live market price rather than fetched
 * — the same way the spec's "Order Book" is described. */
export function OrderBook({ currentPrice }: { currentPrice: number }) {
  const { asks, bids } = useMemo(() => {
    const seed = Math.floor(currentPrice * 100)
    const rng = mulberry32(seed)
    const buildSide = (direction: 1 | -1): OrderBookRow[] =>
      Array.from({ length: 10 }).map((_, i) => {
        const spread = currentPrice * 0.0006 * (i + 1) * direction
        return { price: currentPrice + spread, size: 0.05 + rng() * 4 }
      })
    return { asks: buildSide(1).reverse(), bids: buildSide(-1) }
  }, [currentPrice])

  const maxSize = Math.max(...asks.map((a) => a.size), ...bids.map((b) => b.size))

  return (
    <div className="text-xs">
      <div className="mb-1.5 grid grid-cols-2 px-1 text-slate-500">
        <span>Price</span>
        <span className="text-right">Size</span>
      </div>
      <div className="space-y-0.5">
        {asks.map((row, i) => (
          <BookRow key={`ask-${i}`} row={row} maxSize={maxSize} tone="loss" />
        ))}
      </div>
      <div className="my-2 rounded-md bg-slate-800/60 px-2 py-1.5 text-center font-semibold tabular-nums text-white">
        {formatCurrency(currentPrice)}
      </div>
      <div className="space-y-0.5">
        {bids.map((row, i) => (
          <BookRow key={`bid-${i}`} row={row} maxSize={maxSize} tone="gain" />
        ))}
      </div>
    </div>
  )
}

function BookRow({ row, maxSize, tone }: { row: OrderBookRow; maxSize: number; tone: 'gain' | 'loss' }) {
  const width = (row.size / maxSize) * 100
  const barColor = tone === 'gain' ? 'bg-gain-500/10' : 'bg-loss-500/10'
  const textColor = tone === 'gain' ? 'text-gain-500' : 'text-loss-500'

  return (
    <div className="relative grid grid-cols-2 rounded px-1 py-0.5">
      <div className={`absolute inset-y-0 right-0 ${barColor}`} style={{ width: `${width}%` }} />
      <span className={`relative tabular-nums ${textColor}`}>{formatCurrency(row.price)}</span>
      <span className="relative text-right tabular-nums text-slate-300">{formatNumber(row.size, 3)}</span>
    </div>
  )
}

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
