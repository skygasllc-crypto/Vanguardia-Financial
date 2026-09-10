const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

// Valid ISO 4217 currency codes
const VALID_CURRENCY_CODES = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'NZD'])

function getCurrencyFormatter(currency: string, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${currency}-${maximumFractionDigits}`
  if (!currencyFormatterCache.has(key)) {
    // Use USD formatter for non-standard currency codes (crypto, commodities, etc.)
    const validCurrency = VALID_CURRENCY_CODES.has(currency) ? currency : 'USD'
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat('en-US', { style: 'currency', currency: validCurrency, maximumFractionDigits, minimumFractionDigits: Math.min(2, maximumFractionDigits) }),
    )
  }
  return currencyFormatterCache.get(key)!
}

export function formatCurrency(value: string | number, currency = 'USD'): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'
  const digits = Math.abs(num) > 0 && Math.abs(num) < 1 ? 4 : 2

  // For non-standard currencies (crypto, commodities), format as USD and replace symbol
  if (!VALID_CURRENCY_CODES.has(currency)) {
    const formatted = getCurrencyFormatter('USD', digits).format(num)
    return formatted.replace('$', '$') // Keep $ for crypto/commodities for now
  }

  return getCurrencyFormatter(currency, digits).format(num)
}

export function formatCompactCurrency(value: string | number, currency = 'USD'): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'

  // Use USD formatter for non-standard currency codes
  const validCurrency = VALID_CURRENCY_CODES.has(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: validCurrency, notation: 'compact', maximumFractionDigits: 2 }).format(num)
}

export function formatNumber(value: string | number, maximumFractionDigits = 8): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(num)
}

export function formatPercent(value: string | number, options: { signed?: boolean } = {}): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'
  const sign = options.signed !== false && num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

export function formatSignedCurrency(value: string | number, currency = 'USD'): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'
  const sign = num > 0 ? '+' : num < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(num), currency)}`
}

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, 'day')
}

export function isPositive(value: string | number): boolean {
  const num = typeof value === 'string' ? Number(value) : value
  return num >= 0
}
