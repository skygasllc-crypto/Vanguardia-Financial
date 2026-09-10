'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Sparkline } from '@/components/charts/Sparkline'
import { Badge } from '@/components/common/Badge'
import { PnLText } from '@/components/common/PnLText'
import { Skeleton } from '@/components/common/Spinner'
import { useMarketStore } from '@/store/marketStore'
import { formatCurrency } from '@/lib/format'

/** Live 4-up grid of trending assets for the landing page — the "current
 * topics" equivalent of a corporate homepage's news-card grid, except ours
 * is real-time market data rather than editorial content. */
export function TrendingAssetsGrid() {
  const assets = useMarketStore((s) => s.assets)
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets)

  useEffect(() => {
    fetchMarkets('trending').catch(() => undefined)
  }, [fetchMarkets])

  const trending = Object.values(assets)
    .filter((a) => a.is_trending)
    .slice(0, 4)

  if (trending.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {trending.map((asset) => (
        <Link
          key={asset.id}
          href={`/markets/asset?symbol=${asset.symbol}`}
          className="block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-lg)]"
        >
          <div className="flex items-center justify-between">
            <Badge tone="accent">Trending</Badge>
            <span className="text-xs font-semibold text-slate-400">{asset.symbol}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-navy-900">{asset.name}</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-navy-900">{formatCurrency(asset.current_price)}</p>
          <div className="mt-1">
            <PnLText value={asset.change_24h_pct} mode="percent" size="sm" />
          </div>
          <div className="mt-3">
            <Sparkline points={asset.sparkline} width={140} height={36} />
          </div>
        </Link>
      ))}
    </div>
  )
}
