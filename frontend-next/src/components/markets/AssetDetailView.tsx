'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { PnLText } from '@/components/common/PnLText'
import { Spinner } from '@/components/common/Spinner'
import { api } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import type { AssetDetail, CandlePoint } from '@/types/market'
import { formatCompactCurrency, formatCurrency, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const TABS = ['Overview', 'Chart', 'Market Data', 'News'] as const

/** Shared logic behind both `/markets/asset?symbol=` (public) and
 * `/app/markets/asset?symbol=` (authenticated) — the two trees render the
 * identical view, matching the original React Router config where both
 * `/markets/:symbol` and `/app/markets/:symbol` pointed at one
 * `AssetDetailPage` component. This static-export build has no server, so
 * an unbounded, API-driven id can't be a `[symbol]` file-system route —
 * it's read from a `?symbol=` query param instead. */
export function AssetDetailView() {
  const searchParams = useSearchParams()
  const symbol = searchParams.get('symbol') ?? ''
  const router = useRouter()
  const pathname = usePathname()
  const inApp = pathname?.startsWith('/app') ?? false
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [candles, setCandles] = useState<CandlePoint[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      api.get<AssetDetail>(`/markets/${symbol}`),
      api.get<CandlePoint[]>(`/markets/${symbol}/candles?interval=1h`),
    ])
      .then(([assetData, candleData]) => {
        setAsset(assetData)
        setCandles(candleData)
      })
      .finally(() => setIsLoading(false))
  }, [symbol])

  function goToTrade(side: 'buy' | 'sell') {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    router.push(`/app/trade?symbol=${symbol}&side=${side}`)
  }

  if (isLoading || !asset) return <Spinner />

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-lg font-bold text-white">
            {asset.symbol.slice(0, 2)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900">
              {asset.name} <span className="text-slate-400">{asset.symbol}</span>
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-display text-2xl font-bold tabular-nums text-navy-900">{formatCurrency(asset.current_price)}</span>
              <PnLText value={asset.change_24h_pct} mode="percent" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="buy" onClick={() => goToTrade('buy')}>
            Buy {asset.symbol}
          </Button>
          <Button variant="sell" onClick={() => goToTrade('sell')}>
            Sell {asset.symbol}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t ? 'border-b-2 border-navy-900 text-navy-900' : 'text-slate-500 hover:text-navy-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {(tab === 'Overview' || tab === 'Chart') && (
          <Card padded={false} className="p-4">
            <CandlestickChart
              dark={false}
              data={candles.map((c) => ({ time: c.time as never, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close) }))}
              height={380}
            />
          </Card>
        )}

        {tab === 'Overview' && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Market Cap', formatCompactCurrency(asset.market_cap)],
              ['24h Volume', formatCompactCurrency(asset.volume_24h)],
              ['Circulating Supply', `${formatNumber(asset.circulating_supply, 0)} ${asset.symbol}`],
              ['All-Time High', formatCurrency(asset.all_time_high)],
            ].map(([label, value]) => (
              <Card key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 font-display text-lg font-bold tabular-nums text-navy-900">{value}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'Market Data' && (
          <Card>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Current Price', formatCurrency(asset.current_price)],
                ['24h Change', `${asset.change_24h_pct}%`],
                ['24h High', formatCurrency(asset.high_24h)],
                ['24h Low', formatCurrency(asset.low_24h)],
                ['Market Cap', formatCompactCurrency(asset.market_cap)],
                ['24h Volume', formatCompactCurrency(asset.volume_24h)],
                ['Circulating Supply', `${formatNumber(asset.circulating_supply, 0)} ${asset.symbol}`],
                ['All-Time High', formatCurrency(asset.all_time_high)],
                ['All-Time Low', formatCurrency(asset.all_time_low)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium tabular-nums text-navy-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {tab === 'News' && (
          <Card>
            <p className="text-sm text-slate-500">
              News integration is not part of this MVP. In production, this tab would surface curated market news for {asset.name} from a
              licensed news provider.
            </p>
          </Card>
        )}
      </div>

      {asset.description && tab === 'Overview' && (
        <Card className="mt-6">
          <h3 className="text-sm font-semibold text-navy-900">About {asset.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{asset.description}</p>
        </Card>
      )}

      <p className="mt-6 text-xs text-slate-400">
        <Link href={inApp ? '/app/markets' : '/markets'} className="hover:text-slate-600">← Back to Markets</Link>
      </p>
    </div>
  )
}
