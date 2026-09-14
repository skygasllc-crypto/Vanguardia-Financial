'use client'

import { type CSSProperties, type MouseEvent, type ReactNode, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { Badge } from '@/components/common/Badge'
import { PnLText } from '@/components/common/PnLText'
import { Spinner } from '@/components/common/Spinner'
import { PanelDivider } from '@/components/trading/PanelDivider'
import { OrderTicketModal } from '@/components/trading/OrderTicketModal'
import { SymbolSearchModal } from '@/components/trading/SymbolSearchModal'
import { TradingPortfolioPanel } from '@/components/trading/TradingPortfolioPanel'
import { TradingWatchlistSidebar } from '@/components/trading/TradingWatchlistSidebar'
import { useResizablePanels } from '@/hooks/useResizablePanels'
import { api } from '@/lib/apiClient'
import { websocketService } from '@/lib/websocketService'
import { useMarketStore } from '@/store/marketStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { usePositionsStore } from '@/store/positionsStore'
import { useWatchlistStore } from '@/store/watchlistStore'
import type { AssetDetail, ChartInterval, CandlePoint as MarketCandle } from '@/types/market'
import type { OrderSide } from '@/types/trading'
import { cn } from '@/lib/cn'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

const INTERVALS: ChartInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']

// Only the left rail is rendered now that the order-book column is gone. The
// `right` figures are the shape `useResizablePanels` expects and are kept so
// the hook stays reusable for a second panel; nothing consumes them today.
const PANEL_DEFAULTS = { left: 220, right: 280 }
const PANEL_MIN = { left: 160, right: 220 }
const PANEL_MAX = { left: 420, right: 520 }

function TradingTerminal() {
  const searchParams = useSearchParams()
  const routeSymbol = searchParams.get('symbol')
  const routeSide = searchParams.get('side')
  const router = useRouter()

  const assets = useMarketStore((s) => s.assets)
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets)
  const fetchDataStatus = useMarketStore((s) => s.fetchDataStatus)
  const watchlist = useWatchlistStore((s) => s.items)
  const positions = usePositionsStore((s) => s.positions)
  const summary = usePortfolioStore((s) => s.summary)

  const symbol = (routeSymbol ?? 'BTC').toUpperCase()
  const [openTabs, setOpenTabs] = useState<string[]>([symbol])
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [candles, setCandles] = useState<MarketCandle[]>([])
  // Set when the candle fetch fails outright — the upstream feed rate-limits on
  // the free tier, and a silently empty chart reads as a broken app.
  const [chartError, setChartError] = useState(false)
  const [interval, setInterval_] = useState<ChartInterval>('1h')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [orderTicket, setOrderTicket] = useState<{ side: OrderSide } | null>(null)
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null)
  const [prevPrice, setPrevPrice] = useState<number>(0)

  const { sizes, dragging, startDrag, nudge, resetSizes } = useResizablePanels({
    storageKey: 'vg.trade.panels',
    initial: PANEL_DEFAULTS,
    min: PANEL_MIN,
    max: PANEL_MAX,
  })

  // The portfolio is loaded by the app shell, which reloads it whenever the
  // selected account changes.
  useEffect(() => {
    if (Object.keys(assets).length === 0) fetchMarkets().catch(() => undefined)
    fetchDataStatus().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setOpenTabs((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]))
  }, [symbol])

  // A Buy/Sell click on the asset detail page navigates here with
  // ?side=buy|sell to open the order ticket immediately.
  useEffect(() => {
    if (routeSide === 'buy' || routeSide === 'sell') {
      setOrderTicket({ side: routeSide })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setChartError(false)
    api.get<AssetDetail>(`/markets/${symbol}`).then(setDetail).catch(() => undefined)
    api.get<MarketCandle[]>(`/markets/${symbol}/candles?interval=${interval}`)
      .then((candleData) => {
        setCandles(candleData)
        setChartError(candleData.length === 0)
      })
      .catch(() => {
        setCandles([])
        setChartError(true)
      })
      .finally(() => setIsLoading(false))
  }, [symbol, interval])

  // Subscribe only to symbols this user actually cares about: open chart
  // tabs, watchlist items, and anything they hold a position in.
  useEffect(() => {
    const relevant = new Set([...openTabs, ...watchlist.map((w) => w.asset.symbol), ...positions.map((p) => p.symbol)])
    websocketService.subscribe(Array.from(relevant))
  }, [openTabs, watchlist, positions])

  const liveTick = assets[symbol]
  const currentPrice = Number(liveTick?.current_price ?? detail?.current_price ?? 0)
  const changePct = liveTick?.change_24h_pct ?? detail?.change_24h_pct ?? '0'

  // Flash the price green/red on each move. `prevPrice` has to advance on
  // every tick, including the ones that trigger a flash — anchoring it to the
  // first price ever seen would colour later ticks against a stale reference.
  useEffect(() => {
    if (currentPrice === prevPrice) return
    setPrevPrice(currentPrice)
    if (currentPrice <= 0 || prevPrice <= 0) return

    setPriceChange(currentPrice > prevPrice ? 'up' : 'down')
    const timer = setTimeout(() => setPriceChange(null), 1000)
    return () => clearTimeout(timer)
  }, [currentPrice, prevPrice])

  const chartData = useMemo(
    () => candles.map((c) => ({ time: c.time as never, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close) })),
    [candles],
  )

  function goToSymbol(sym: string) {
    router.push(`/app/trade?symbol=${sym}`)
  }

  function closeTab(sym: string, e: MouseEvent) {
    e.stopPropagation()
    setOpenTabs((prev) => {
      const next = prev.filter((s) => s !== sym)
      if (next.length === 0) next.push('BTC')
      if (sym === symbol) goToSymbol(next[next.length - 1])
      return next
    })
  }

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-4rem)] flex-col bg-navy-950 sm:-mx-6 lg:-mx-8">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-navy-900 px-3 pt-2 scrollbar-thin">
        {openTabs.map((sym) => (
          <div
            key={sym}
            className={cn(
              'group flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 pl-3 pr-1.5 py-2 text-xs font-semibold transition-colors',
              sym === symbol
                ? 'border-white/10 bg-navy-950 text-white'
                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            <button onClick={() => goToSymbol(sym)}>{sym}/USD</button>
            <button
              onClick={(e) => closeTab(sym, e)}
              aria-label={`Close ${sym} tab`}
              className="rounded-full p-0.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        <button
          onClick={() => setIsSearchOpen(true)}
          aria-label="Add symbol tab"
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="border-b border-white/10 bg-navy-950 px-4 py-3 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Available Balance</p>
              <p className="mt-0.5 font-semibold tabular-nums text-white">{formatCurrency(summary?.available_cash_balance ?? 0)}</p>
            </div>
          </div>
        </div>
        {isLoading && !detail ? (
          <Spinner />
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <p className="font-display text-2xl font-bold tabular-nums text-white">{symbol}/USD</p>
            <Stat
              label="Price"
              value={
                <span className={cn(
                  'transition-colors duration-300',
                  priceChange === 'up' && 'text-gain-400',
                  priceChange === 'down' && 'text-loss-400'
                )}>
                  {formatCurrency(currentPrice)}
                  {priceChange === 'up' && <span className="ml-1 text-sm">↑</span>}
                  {priceChange === 'down' && <span className="ml-1 text-sm">↓</span>}
                </span>
              }
              big
            />
            <Stat label="24h Change" value={<PnLText value={changePct} mode="percent" />} />
            <Stat label="24h High" value={formatCurrency(detail?.high_24h ?? 0)} />
            <Stat label="24h Low" value={formatCurrency(detail?.low_24h ?? 0)} />
            <Stat label="24h Volume" value={formatCompactCurrency(detail?.volume_24h ?? 0)} />
            <Stat label="Market Status" value={<Badge tone="gain">Open</Badge>} />
          </div>
        )}
      </div>

      {/* Resizable workspace: watchlist rail plus chart. Flex with an explicit
          px width on the rail rather than a CSS grid, because the divider
          writes a live pixel width during a drag and the chart takes whatever
          is left. Below xl the two stack and the width is ignored, so the
          terminal still works on a phone. */}
      <div className="flex flex-1 flex-col xl:flex-row">
        {/* The dragged width is published as a custom property and only
            consumed at xl, so the stacked mobile layout keeps its full width
            instead of inheriting a desktop pixel size. */}
        <TradingWatchlistSidebar
          activeSymbol={symbol}
          onSelect={goToSymbol}
          className="order-2 w-full shrink-0 xl:order-1 xl:w-[var(--panel-w)]"
          style={{ '--panel-w': `${sizes.left}px` } as CSSProperties}
        />

        <PanelDivider
          label="Resize watchlist panel"
          isDragging={dragging === 'left'}
          onPointerDown={() => startDrag('left')}
          onNudge={(d) => nudge('left', d)}
        />

        <div className="order-1 flex min-w-0 flex-1 flex-col border-b border-white/10 p-3 xl:order-2 xl:border-b-0 xl:border-l">
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {INTERVALS.map((i) => (
              <button
                key={i}
                onClick={() => setInterval_(i)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  interval === i ? 'bg-accent-600 text-white' : 'text-slate-400 hover:bg-white/5',
                )}
              >
                {i}
              </button>
            ))}
            <button
              onClick={resetSizes}
              className="ml-auto hidden rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 xl:block"
            >
              Reset layout
            </button>
          </div>
          {chartError ? (
            <div
              style={{ height: 480 }}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 text-center"
            >
              <p className="text-sm font-medium text-slate-300">Chart data unavailable</p>
              <p className="max-w-xs text-xs text-slate-500">
                The price feed did not return history for {symbol} at {interval}. Try another interval, or check back
                shortly.
              </p>
            </div>
          ) : (
            <CandlestickChart data={chartData} livePrice={currentPrice} interval={interval} height={480} dark />
          )}
        </div>

      </div>

      <div className="bg-slate-50 p-4 sm:p-6">
        <TradingPortfolioPanel onPlaceOrder={() => setOrderTicket({ side: 'buy' })} />
      </div>

      <SymbolSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={goToSymbol} />

      <OrderTicketModal
        isOpen={orderTicket !== null}
        onClose={() => setOrderTicket(null)}
        symbol={symbol}
        currentPrice={currentPrice}
        initialSide={orderTicket?.side ?? 'buy'}
      />
    </div>
  )
}

function Stat({ label, value, big }: { label: string; value: ReactNode; big?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className={cn('mt-0.5 font-semibold text-white', big ? 'text-lg' : 'text-sm')}>{value}</div>
    </div>
  )
}

export default function TradePage() {
  return (
    <Suspense>
      <TradingTerminal />
    </Suspense>
  )
}
