'use client'

import { AreaSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export interface AreaPoint {
  time: number
  value: number
}

interface PortfolioAreaChartProps {
  data: AreaPoint[]
  positive?: boolean
  height?: number
}

export function PortfolioAreaChart({ data, positive = true, height = 320 }: PortfolioAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#64748b', fontFamily: 'Inter, sans-serif' },
      grid: { horzLines: { color: '#f1f5f9' }, vertLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { horzLine: { labelBackgroundColor: '#0a1929' }, vertLine: { labelBackgroundColor: '#0a1929' } },
    })

    const lineColor = positive ? '#17a367' : '#e0483f'
    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: positive ? 'rgba(23,163,103,0.24)' : 'rgba(224,72,63,0.24)',
      bottomColor: 'rgba(255,255,255,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, positive])

  useEffect(() => {
    seriesRef.current?.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={containerRef} className="w-full" />
}
