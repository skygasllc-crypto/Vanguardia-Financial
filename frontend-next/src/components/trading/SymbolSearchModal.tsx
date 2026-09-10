'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { PnLText } from '@/components/common/PnLText'
import { useMarketStore } from '@/store/marketStore'
import type { MarketCategory } from '@/types/market'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

const CATEGORIES: { key: MarketCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'top_gainers', label: 'Top Gainers' },
  { key: 'top_losers', label: 'Top Losers' },
  { key: 'popular', label: 'Popular' },
  { key: 'new_listings', label: 'New Listings' },
]

interface SymbolSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (symbol: string) => void
}

/** Symbol picker modeled on a WebTrader-style "add symbol" dialog: category
 * rail on the left, live search + result list on the right. */
export function SymbolSearchModal({ isOpen, onClose, onSelect }: SymbolSearchModalProps) {
  const assets = useMarketStore((s) => s.assets)
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets)
  const [category, setCategory] = useState<MarketCategory | 'all'>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (isOpen && Object.keys(assets).length === 0) fetchMarkets().catch(() => undefined)
  }, [isOpen, assets, fetchMarkets])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const filtered = useMemo(() => {
    let list = Object.values(assets)
    if (category === 'trending') list = list.filter((a) => a.is_trending)
    else if (category === 'new_listings') list = list.filter((a) => a.is_new_listing)
    else if (category === 'top_gainers') list = [...list].sort((a, b) => Number(b.change_24h_pct) - Number(a.change_24h_pct))
    else if (category === 'top_losers') list = [...list].sort((a, b) => Number(a.change_24h_pct) - Number(b.change_24h_pct))
    else if (category === 'popular') list = [...list].sort((a, b) => Number(b.volume_24h) - Number(a.volume_24h))

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    }
    return list
  }, [assets, category, query])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add symbol"
        className="relative flex h-[560px] w-full max-w-2xl overflow-hidden rounded-2xl bg-navy-900 shadow-[var(--shadow-card-lg)]"
      >
        <div className="w-44 shrink-0 border-r border-white/10 bg-navy-950/60 py-3">
          <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add symbol</p>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-colors',
                category === c.key ? 'bg-accent-600/20 text-accent-400' : 'text-slate-300 hover:bg-white/5',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-slate-500">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets — symbol or name"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              aria-label="Search symbols"
            />
            <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No matching assets.</p>}
            {filtered.map((a) => {
              const changePct = Number(a.change_24h_pct)
              return (
                <button
                  key={a.symbol}
                  onClick={() => {
                    onSelect(a.symbol)
                    onClose()
                  }}
                  className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left hover:bg-white/5"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{a.symbol}</p>
                    <p className="text-xs text-slate-500">{a.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-white">{formatCurrency(a.current_price)}</p>
                    <PnLText value={changePct} mode="percent" size="sm" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
