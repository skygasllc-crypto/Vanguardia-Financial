const PALETTE = ['#2f7dc9', '#17a367', '#b8933f', '#5b8def', '#94a3b8', '#e0483f', '#7c8fac']

interface AllocationDonutProps {
  slices: { label: string; percentage: number }[]
  size?: number
}

export function AllocationDonut({ slices, size = 160 }: AllocationDonutProps) {
  const radius = size / 2
  const strokeWidth = size * 0.16
  const innerRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * innerRadius

  let offset = 0

  if (slices.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={radius} cy={radius} r={innerRadius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Portfolio allocation">
      <g transform={`rotate(-90 ${radius} ${radius})`}>
        {slices.map((slice, i) => {
          const length = (slice.percentage / 100) * circumference
          const dasharray = `${length} ${circumference - length}`
          const el = (
            <circle
              key={slice.label}
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += length
          return el
        })}
      </g>
    </svg>
  )
}

export function allocationColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}
