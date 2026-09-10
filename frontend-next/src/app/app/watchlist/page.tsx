'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PnLText } from '@/components/common/PnLText'
import { Skeleton } from '@/components/common/Spinner'
import { useWatchlistStore } from '@/store/watchlistStore'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/format'

export default function WatchlistPage() {
  const items = useWatchlistStore((s) => s.items)
  const isLoading = useWatchlistStore((s) => s.isLoading)
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)
  const removeFromWatchlist = useWatchlistStore((s) => s.removeFromWatchlist)

  useEffect(() => {
    fetchWatchlist().catch(() => undefined)
  }, [fetchWatchlist])

  async function handleRemove(itemId: string) {
    try {
      await removeFromWatchlist(itemId)
    } catch {
      toast.error('Could not remove from watchlist.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy-900">Watchlist</h1>
          <p className="text-sm text-slate-500">Assets you&apos;re tracking. Add more from the Markets page.</p>
        </div>
        <Link href="/app/markets">
          <Button variant="secondary" size="sm">Browse Markets</Button>
        </Link>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Add cryptocurrencies from the Markets page to track live price and 24-hour change here."
          action={<Link href="/app/markets"><Button size="sm">Browse Markets</Button></Link>}
        />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-4">
                <Link href={`/app/markets/asset?symbol=${item.asset.symbol}`} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                    {item.asset.symbol.slice(0, 2)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-navy-900">{item.asset.symbol}</span>
                    <span className="block text-xs text-slate-500">{item.asset.name}</span>
                  </span>
                </Link>
                <div className="flex items-center gap-6">
                  <span className="tabular-nums text-sm font-medium text-navy-900">{formatCurrency(item.asset.current_price)}</span>
                  <PnLText value={item.asset.change_24h_pct} mode="percent" size="sm" />
                  <Link href={`/app/trade?symbol=${item.asset.symbol}`}>
                    <Button size="sm" variant="secondary">Trade</Button>
                  </Link>
                  <button
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove ${item.asset.symbol} from watchlist`}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-loss-50 hover:text-loss-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
