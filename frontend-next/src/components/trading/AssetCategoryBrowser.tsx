'use client'

import { useEffect, useMemo, useState } from 'react'

import { Spinner } from '@/components/common/Spinner'
import { useMarketStore } from '@/store/marketStore'
import type { AssetCategoryCount, AssetSummary, AssetType } from '@/types/market'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

interface AssetCategoryBrowserProps {
  activeSymbol: string
  onSelect: (symbol: string) => void
}

/** Category rail for the trading terminal.
 *
 * Every group carries its instrument count, so the size of each market is
 * visible before drilling in. Equities are split by home market because a US
 * listing and a Chinese listing trade on different hours, currencies and
 * settlement rules — grouping them together would be a false equivalence. The
 * count on the Stocks row is the total; the nested rows partition it. */
export function AssetCategoryBrowser({ activeSymbol, onSelect }: AssetCategoryBrowserProps) {
  const categories = useMarketStore((s) => s.categories)
  const fetchCategories = useMarketStore((s) => s.fetchCategories)
  const queryMarkets = useMarketStore((s) => s.queryMarkets)
  const liveAssets = useMarketStore((s) => s.assets)

  const [openKey, setOpenKey] = useState<string | null>(null)
  const [region, setRegion] = useState<string | null>(null)
  // Rows are tagged with the group they were fetched for, so a slow response
  // for a group the user has since collapsed or switched away from is ignored
  // rather than briefly painted under the wrong heading.
  const [loaded, setLoaded] = useState<{ key: string; region: string | null; list: AssetSummary[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCategories().catch(() => undefined)
  }, [fetchCategories])

  useEffect(() => {
    if (!openKey) return
    let cancelled = false
    // Spinner flag for a request this effect owns. There is no render-time
    // value to derive it from, and it is set once per group change rather than
    // in a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    queryMarkets({ assetType: openKey as AssetType, region: region ?? undefined, limit: 500 })
      .then((list) => {
        if (!cancelled) setLoaded({ key: openKey, region, list })
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [openKey, region, queryMarkets])

  // Merge in websocket ticks so an open group keeps quoting live. Rows from a
  // different group than the one on screen are discarded, not rendered.
  const list = useMemo(() => {
    if (!loaded || loaded.key !== openKey || loaded.region !== region) return []
    return loaded.list.map((r) => liveAssets[r.symbol] ?? r)
  }, [loaded, openKey, region, liveAssets])

  function toggle(cat: AssetCategoryCount) {
    if (openKey === cat.key) {
      setOpenKey(null)
      setRegion(null)
    } else {
      setOpenKey(cat.key)
      setRegion(null)
    }
  }

  if (categories.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-500">Loading categories…</p>
  }

  return (
    <div className="flex flex-col">
      {categories.map((cat) => {
        const isOpen = openKey === cat.key
        return (
          <div key={cat.key} className="border-b border-white/5 last:border-b-0">
            <button
              onClick={() => toggle(cat)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors',
                isOpen ? 'bg-white/5 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                <Chevron isOpen={isOpen} />
                {cat.label}
              </span>
              <CountPill count={cat.count} />
            </button>

            {isOpen && (
              <div>
                {cat.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    <RegionChip label="All" count={cat.count} isActive={region === null} onClick={() => setRegion(null)} />
                    {cat.groups.map((g) => (
                      <RegionChip
                        key={g.key}
                        label={g.label}
                        count={g.count}
                        isActive={region === g.key}
                        onClick={() => setRegion(g.key)}
                      />
                    ))}
                  </div>
                )}

                {isLoading ? (
                  <div className="px-3 py-3">
                    <Spinner />
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    {list.map((a) => {
                      const changePct = Number(a.change_24h_pct)
                      return (
                        <button
                          key={a.symbol}
                          onClick={() => onSelect(a.symbol)}
                          className={cn(
                            'flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left transition-colors',
                            a.symbol === activeSymbol ? 'bg-accent-600/20' : 'hover:bg-white/5',
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white">{a.symbol}</span>
                            <span className="block truncate text-[10px] text-slate-500">{a.name}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs tabular-nums text-slate-200">{formatCurrency(a.current_price)}</span>
                            <span
                              className={cn(
                                'block text-[10px] tabular-nums',
                                changePct >= 0 ? 'text-gain-400' : 'text-loss-400',
                              )}
                            >
                              {changePct >= 0 ? '+' : ''}
                              {changePct.toFixed(2)}%
                            </span>
                          </span>
                        </button>
                      )
                    })}
                    {list.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No instruments in this group.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-300">
      {count}
    </span>
  )
}

function RegionChip({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
        isActive ? 'bg-accent-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200',
      )}
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )
}

function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className={cn('transition-transform', isOpen && 'rotate-90')}
      aria-hidden
    >
      <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
