'use client'

import {
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
  createChart,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export interface CandlePoint {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

/** Seconds per bar, so a live tick can be placed in the right bucket. */
const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600,
  '4h': 14400, '1d': 86400, '1w': 604800, '1M': 2592000,
}

interface CandlestickChartProps {
  data: CandlePoint[]
  livePrice?: number
  /** Bar size, needed to know when a tick opens a new candle. */
  interval?: keyof typeof INTERVAL_SECONDS | string
  height?: number
  dark?: boolean
}

export function CandlestickChart({ data, livePrice, interval = '1h', height = 420, dark = true }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLineRef = useRef<IPriceLine | null>(null)
  // The bar currently forming. Held in a ref so a websocket tick can extend it
  // without re-rendering the whole component on every price move.
  const liveBarRef = useRef<CandlePoint | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: dark ? '#94a3b8' : '#64748b',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        horzLines: { color: dark ? '#16304e' : '#f1f5f9' },
        vertLines: { color: dark ? '#16304e' : '#f1f5f9' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#17a367',
      downColor: '#e0483f',
      borderVisible: false,
      wickUpColor: '#17a367',
      wickDownColor: '#e0483f',
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [height, dark])

  useEffect(() => {
    seriesRef.current?.setData(data)
    chartRef.current?.timeScale().fitContent()
    // The last historical bar is the one live ticks extend from here on.
    liveBarRef.current = data.length > 0 ? { ...data[data.length - 1] } : null
  }, [data])

  // Grow the forming candle from live ticks.
  //
  // `setData` only runs when the REST fetch returns, so without this the
  // candles were frozen between interval changes and only the dashed price
  // line moved. Each tick either extends the open bar (raising its high,
  // lowering its low, moving its close) or, once the clock crosses into the
  // next bucket, opens a fresh bar at the tick price.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !livePrice || livePrice <= 0) return

    const bucket = INTERVAL_SECONDS[interval] ?? 3600
    const nowBucket = Math.floor(Date.now() / 1000 / bucket) * bucket
    const bar = liveBarRef.current

    if (bar === null || nowBucket > Number(bar.time)) {
      // A candle opens flat at the first price seen in its window.
      const fresh: CandlePoint = {
        time: nowBucket as Time,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      }
      liveBarRef.current = fresh
      series.update(fresh)
      return
    }

    const next: CandlePoint = {
      ...bar,
      high: Math.max(bar.high, livePrice),
      low: Math.min(bar.low, livePrice),
      close: livePrice,
    }
    liveBarRef.current = next
    series.update(next)
  }, [livePrice, interval])

  // Dashed marker tracking the last traded price.
  useEffect(() => {
    if (!seriesRef.current || !livePrice) return

    // Remove old price line if exists
    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current)
    }

    // Add new price line
    priceLineRef.current = seriesRef.current.createPriceLine({
      price: livePrice,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Live',
    })
  }, [livePrice])

  return <div ref={containerRef} className="w-full" />
}
