import { isPositive } from '@/lib/format'

interface SparklineProps {
  points: (string | number)[]
  width?: number
  height?: number
}

/** A tiny inline trend line for market table rows — deliberately dependency
 * free (raw SVG) since it renders many times per page. */
export function Sparkline({ points, width = 96, height = 32 }: SparklineProps) {
  const values = points.map((p) => Number(p)).filter((v) => Number.isFinite(v))
  if (values.length < 2) return <div style={{ width, height }} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const trendingUp = isPositive(values[values.length - 1] - values[0])
  const color = trendingUp ? '#17a367' : '#e0483f'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
