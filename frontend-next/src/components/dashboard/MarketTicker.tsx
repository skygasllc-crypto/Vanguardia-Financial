'use client'

import { useEffect } from 'react'

import { useMarketStore } from '@/store/marketStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Horizontal auto-scrolling strip of live prices, for placement along a
 * hero band or page edge. Renders the row twice back-to-back so the CSS
 * marquee loops seamlessly. */
export function MarketTicker({ className }: { className?: string }) {
  const assets = useMarketStore((s) => s.assets)
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets)

  useEffect(() => {
    fetchMarkets('trending').catch(() => undefined)
  }, [fetchMarkets])

  const rows = Object.values(assets).slice(0, 8)
  if (rows.length === 0) return null

  const row = (keyPrefix: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={keyPrefix === 'dup'}>
      {rows.map((a) => {
        const changePct = Number(a.change_24h_pct)
        const isGain = changePct >= 0
        return (
          <div key={`${keyPrefix}-${a.symbol}`} className="flex items-center gap-2 border-r border-white/10 px-6 py-3 text-sm whitespace-nowrap">
            <span className="font-semibold text-white">{a.symbol}</span>
            <span className="tabular-nums text-slate-300">{formatCurrency(a.current_price)}</span>
            <span className={cn('tabular-nums font-medium', isGain ? 'text-gain-500' : 'text-loss-500')}>
              {isGain ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={cn('overflow-hidden border-t border-white/10 bg-black/30 backdrop-blur-sm', className)}>
      <div className="flex w-max animate-[ticker_38s_linear_infinite]">
        {row('a')}
        {row('dup')}
      </div>
    </div>
  )
}
