import { formatPercent, formatSignedCurrency, isPositive } from '@/lib/format'
import { cn } from '@/lib/cn'

interface PnLTextProps {
  value: string | number
  currency?: string
  mode?: 'currency' | 'percent'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' }

/** Renders a profit/loss figure with both color AND a directional glyph, so
 * the signal never relies on color alone (accessibility requirement). */
export function PnLText({ value, currency = 'USD', mode = 'currency', size = 'md', showIcon = true }: PnLTextProps) {
  const positive = isPositive(value)
  const text = mode === 'currency' ? formatSignedCurrency(value, currency) : formatPercent(value)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        positive ? 'text-gain-600' : 'text-loss-600',
        sizeClasses[size],
      )}
    >
      {showIcon && (
        <svg width="10" height="10" viewBox="0 0 10 10" className={cn(!positive && 'rotate-180')} aria-hidden="true">
          <path d="M5 0L10 8H0L5 0Z" fill="currentColor" />
        </svg>
      )}
      {text}
    </span>
  )
}
