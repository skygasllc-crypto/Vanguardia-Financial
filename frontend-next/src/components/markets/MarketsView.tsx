'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Sparkline } from '@/components/charts/Sparkline'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { PnLText } from '@/components/common/PnLText'
import { Skeleton } from '@/components/common/Spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/authStore'
import { useMarketStore } from '@/store/marketStore'
import { useWatchlistStore } from '@/store/watchlistStore'
import type { AssetSummary, AssetType, MarketCategory } from '@/types/market'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

const ASSET_TYPES: { key: AssetType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Assets' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'stock', label: 'Stocks' },
  { key: 'forex', label: 'Forex' },
  { key: 'commodity', label: 'Commodities' },
]

const CATEGORIES: { key: MarketCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'top_gainers', label: 'Top Gainers' },
  { key: 'top_losers', label: 'Top Losers' },
  { key: 'popular', label: 'Popular' },
  { key: 'new_listings', label: 'New Listings' },
]

/** Shared logic behind both `/markets` (public) and `/app/markets`
 * (authenticated) — the two trees render the identical view, matching the
 * original React Router config where both routes pointed at one
 * `MarketsPage` component. */
export function MarketsView() {
  const assets = useMarketStore((s) => s.assets)
  const isLoading = useMarketStore((s) => s.isLoading)
  const queryMarkets = useMarketStore((s) => s.queryMarkets)
  const categories = useMarketStore((s) => s.categories)
  const fetchCategories = useMarketStore((s) => s.fetchCategories)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const watchlist = useWatchlistStore((s) => s.items)
  const isWatched = useWatchlistStore((s) => s.isWatched)
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist)
  const removeFromWatchlist = useWatchlistStore((s) => s.removeFromWatchlist)
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)

  const pathname = usePathname()
  const inApp = pathname?.startsWith('/app') ?? false

  const [assetType, setAssetType] = useState<AssetType | 'all'>('all')
  const [region, setRegion] = useState<string | null>(null)
  const [category, setCategory] = useState<MarketCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // The current filtered result set, rendered directly rather than derived
  // from the shared `assets` cache — that cache accumulates every asset
  // ever fetched (needed elsewhere for lookups/live ticks), so deriving the
  // visible table from it would keep showing rows from a previous filter.
  const [results, setResults] = useState<AssetSummary[]>([])

  useEffect(() => {
    fetchCategories().catch(() => undefined)
  }, [fetchCategories])

  useEffect(() => {
    let cancelled = false
    queryMarkets({
      category: category === 'all' ? undefined : category,
      assetType: assetType === 'all' ? undefined : assetType,
      // Region only narrows equities; the other classes have no home market.
      region: assetType === 'stock' && region ? region : undefined,
      search: debouncedSearch || undefined,
      limit: 500,
    })
      .then((list) => {
        if (!cancelled) setResults(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [category, assetType, region, debouncedSearch, queryMarkets])

  useEffect(() => {
    if (isAuthenticated) fetchWatchlist().catch(() => undefined)
  }, [isAuthenticated, fetchWatchlist])

  // Live price ticks land in the shared `assets` cache via WebSocket — merge
  // those updates into the currently-displayed rows so prices stay live.
  const list = useMemo(() => results.map((r) => assets[r.symbol] ?? r), [results, assets])

  const stockGroups = useMemo(() => categories.find((c) => c.key === 'stock')?.groups ?? [], [categories])
  const totalCount = useMemo(() => categories.reduce((sum, c) => sum + c.count, 0), [categories])

  /** Instrument count for a tab; null while the counts are still loading. */
  function countFor(key: AssetType | 'all'): number | null {
    if (categories.length === 0) return null
    if (key === 'all') return totalCount
    return categories.find((c) => c.key === key)?.count ?? 0
  }

  async function toggleWatch(assetId: string, symbol: string) {
    if (!isAuthenticated) return
    const existing = watchlist.find((w) => w.asset.symbol === symbol)
    if (existing) await removeFromWatchlist(existing.id).catch(() => undefined)
    else await addToWatchlist(assetId).catch(() => undefined)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Markets</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount > 0 ? `${totalCount} instruments across crypto, equities, forex and commodities.` : 'Crypto, equities, forex and commodities.'}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input placeholder="Search assets…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search assets" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ASSET_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setAssetType(t.key)
              setRegion(null)
              setCategory('all')
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              assetType === t.key ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {countFor(t.key) !== null && (
              <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
                {countFor(t.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* US and Chinese listings are separated because they are different
          markets — different hours, currency and settlement — not two labels
          for the same thing. Only shown while the equities tab is active. */}
      {assetType === 'stock' && stockGroups.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Market</span>
          <button
            onClick={() => setRegion(null)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              region === null ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All <span className="tabular-nums opacity-70">{countFor('stock')}</span>
          </button>
          {stockGroups.map((g) => (
            <button
              key={g.key}
              onClick={() => setRegion(g.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                region === g.key ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {g.label} <span className="tabular-nums opacity-70">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c.key ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">24h Change</th>
                <th className="px-5 py-3">Market Cap</th>
                <th className="px-5 py-3">24h Volume</th>
                <th className="px-5 py-3">Chart</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && list.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-5 py-4" colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : list.map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <Link href={`${inApp ? '/app' : ''}/markets/asset?symbol=${asset.symbol}`} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                            {asset.symbol.slice(0, 2)}
                          </span>
                          <span>
                            <span className="block font-semibold text-navy-900">{asset.symbol}</span>
                            <span className="block text-xs text-slate-500">{asset.name}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-medium tabular-nums text-navy-900">{formatCurrency(asset.current_price)}</td>
                      <td className="px-5 py-4">
                        <PnLText value={asset.change_24h_pct} mode="percent" size="sm" />
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-600">{formatCompactCurrency(asset.market_cap)}</td>
                      <td className="px-5 py-4 tabular-nums text-slate-600">{formatCompactCurrency(asset.volume_24h)}</td>
                      <td className="px-5 py-4">
                        <Sparkline points={asset.sparkline} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isAuthenticated && (
                          <Button
                            size="sm"
                            variant={isWatched(asset.symbol) ? 'secondary' : 'ghost'}
                            onClick={() => toggleWatch(asset.id, asset.symbol)}
                            aria-pressed={isWatched(asset.symbol)}
                          >
                            {isWatched(asset.symbol) ? '★ Watching' : '☆ Watch'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
