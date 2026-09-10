'use client'

import { type CSSProperties, useEffect, useState } from 'react'

import { AssetCategoryBrowser } from '@/components/trading/AssetCategoryBrowser'
import { SymbolSearchModal } from '@/components/trading/SymbolSearchModal'
import { useMarketStore } from '@/store/marketStore'
import { useWatchlistStore } from '@/store/watchlistStore'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

interface TradingWatchlistSidebarProps {
  activeSymbol: string
  onSelect: (symbol: string) => void
  className?: string
  /** Carries the resizable workspace's width custom property. */
  style?: CSSProperties
}

const TABS = ['Watchlist', 'Markets'] as const

/** Dark instrument panel for the trading workspace. Two modes: the user's own
 * watchlist, and a browse-by-category rail over the whole universe. Falls back
 * to trending assets when the saved watchlist is empty so it is never blank. */
export function TradingWatchlistSidebar({ activeSymbol, onSelect, className, style }: TradingWatchlistSidebarProps) {
  const items = useWatchlistStore((s) => s.items)
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist)
  const assets = useMarketStore((s) => s.assets)
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Watchlist')

  useEffect(() => {
    fetchWatchlist().catch(() => undefined)
    if (Object.keys(assets).length === 0) fetchMarkets('trending').catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = items.length > 0 ? items.map((i) => i.asset) : Object.values(assets).slice(0, 10)

  async function handleAdd(symbol: string) {
    const asset = assets[symbol] ?? (await fetchMarkets().then(() => useMarketStore.getState().assets[symbol]))
    if (asset && !items.some((i) => i.asset.symbol === symbol)) {
      try {
        await addToWatchlist(asset.id)
      } catch {
        // Non-fatal: the symbol can still be opened even if saving to the list fails.
      }
    }
    onSelect(symbol)
  }

  return (
    <div style={style} className={cn('flex min-w-0 flex-col border-white/10 bg-navy-950 border-b xl:border-b-0 xl:border-r', className)}>
      <div className="flex items-center justify-between gap-1 border-b border-white/10 px-2 py-2">
        <div className="flex min-w-0 gap-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsSearchOpen(true)}
          aria-label="Add symbol to watchlist"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {tab === 'Markets' ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AssetCategoryBrowser activeSymbol={activeSymbol} onSelect={onSelect} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {rows.map((a) => {
          const changePct = Number(a.change_24h_pct)
          const isGain = changePct >= 0
          const isActive = a.symbol === activeSymbol
          return (
            <button
              key={a.symbol}
              onClick={() => onSelect(a.symbol)}
              className={cn(
                'flex w-full items-center justify-between border-b border-white/5 px-3 py-2.5 text-left transition-colors',
                isActive ? 'bg-accent-600/15' : 'hover:bg-white/5',
              )}
            >
              <div>
                <p className={cn('text-sm font-semibold', isActive ? 'text-accent-400' : 'text-white')}>{a.symbol}</p>
                <p className="text-[11px] text-slate-500">{a.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs tabular-nums text-slate-200">{formatCurrency(a.current_price)}</p>
                <p className={cn('text-[11px] tabular-nums font-medium', isGain ? 'text-gain-500' : 'text-loss-500')}>
                  {isGain ? '+' : ''}
                  {changePct.toFixed(2)}%
                </p>
              </div>
            </button>
          )
        })}
        {rows.length === 0 && <p className="p-4 text-center text-xs text-slate-500">No assets yet.</p>}
      </div>
      )}

      <SymbolSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={handleAdd} />
    </div>
  )
}
