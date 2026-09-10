'use client'

import { AreaSeries, ColorType, type IChartApi, type ISeriesApi, type Time, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

import type { EquityPoint } from '@/types/account'

/** The account's progress chart.
 *
 * Equity rather than balance: balance only moves when a trade settles, so a
 * balance line is flat through exactly the periods a trader most wants to see.
 * Equity marks open positions to market, which is what "progress" means while
 * a position is running. */
export function EquityChart({ points, height = 220 }: { points: EquityPoint[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, sans-serif',
      },
      grid: { horzLines: { color: '#f1f5f9' }, vertLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      handleScroll: false,
      handleScale: false,
    })
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, 0.22)',
      bottomColor: 'rgba(37, 99, 235, 0.02)',
      lineWidth: 2,
    })
    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver((entries) => chart.applyOptions({ width: entries[0].contentRect.width }))
    ro.observe(containerRef.current)
    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [height])

  useEffect(() => {
    if (!seriesRef.current) return
    // Snapshots can share a second; lightweight-charts requires strictly
    // ascending times, so same-second points collapse to the latest.
    const seen = new Map<number, number>()
    for (const p of points) {
      seen.set(Math.floor(new Date(p.taken_at).getTime() / 1000), Number(p.equity))
    }
    const data = [...seen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as Time, value }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [points])

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 text-center"
      >
        <p className="text-sm font-medium text-slate-500">No history yet</p>
        <p className="max-w-xs text-xs text-slate-400">
          Equity is recorded periodically. Points appear here once the account has been funded or traded.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full" />
}
