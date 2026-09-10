export type AssetType = 'crypto' | 'stock' | 'forex' | 'commodity'

export interface AssetSummary {
  id: string
  symbol: string
  name: string
  asset_type: AssetType
  icon_url: string | null
  /** Home market and listing venue — equities only; null for the global
   * instrument classes (crypto, forex, commodities). */
  region: string | null
  exchange: string | null
  /** Per-asset, because only crypto has an upstream feed: an equity is
   * simulated even when the platform is running in live mode. */
  data_source: 'live' | 'simulated' 
  current_price: string
  change_24h_pct: string
  market_cap: string
  volume_24h: string
  is_trending: boolean
  is_new_listing: boolean
  sparkline: string[]
}

export interface AssetDetail extends AssetSummary {
  open_24h: string
  high_24h: string
  low_24h: string
  circulating_supply: string
  all_time_high: string
  all_time_low: string
  description: string | null
}

export interface CandlePoint {
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export type MarketCategory = 'trending' | 'top_gainers' | 'top_losers' | 'popular' | 'new_listings'
export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M'

export interface MarketDataStatus {
  /** The platform-wide ceiling, not a per-asset promise — read the counts
   * below, or an asset's own `data_source`, before labelling anything "live". */
  source: 'live' | 'simulated'
  provider: string
  trading_mode: string
  live_symbol_count: number
  simulated_symbol_count: number
  live_asset_types: AssetType[]
}

/** One entry in the trading terminal's category rail: an asset class and how
 * many instruments it holds, with equities nested by home market. */
export interface AssetCategoryCount {
  key: string
  label: string
  count: number
  groups: AssetCategoryCount[]
}
