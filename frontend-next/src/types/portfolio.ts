import type { DataSource, Position } from './trading'

export interface AllocationSlice {
  symbol: string
  name: string
  value: string
  percentage: string
}

export interface PortfolioHistoryPoint {
  timestamp: number
  value: string
}

export interface PortfolioSummary {
  data_source: DataSource
  total_portfolio_value: string
  available_cash_balance: string
  locked_balance: string
  value_of_crypto_assets: string
  total_unrealized_profit_loss: string
  total_realized_profit_loss: string
  total_profit_loss: string
  total_profit_loss_pct: string
  daily_profit_loss: string
  daily_profit_loss_pct: string
  currency: string
  allocation: AllocationSlice[]
  positions: Position[]
  history: PortfolioHistoryPoint[]
}
