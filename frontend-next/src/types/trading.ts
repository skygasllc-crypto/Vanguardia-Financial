export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop_limit'
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
export type PositionStatus = 'open' | 'closed'
export type AccountType = 'demo' | 'real'
export type DataSource = 'engine' | 'admin_managed'

export interface Order {
  id: string
  symbol: string
  side: OrderSide
  order_type: OrderType
  quantity: string
  price: string | null
  stop_price: string | null
  filled_price: string | null
  account_id: string | null
  take_profit_price: string | null
  stop_loss_price: string | null
  status: OrderStatus
  created_at: string
}

export interface Trade {
  id: string
  order_id: string
  symbol: string
  side: OrderSide
  quantity: string
  execution_price: string
  total_value: string
  realized_profit_loss: string | null
  executed_at: string
}

export interface Position {
  id: string
  symbol: string
  quantity: string
  average_entry_price: string
  total_cost_basis: string
  current_market_price: string
  current_market_value: string
  unrealized_profit_loss: string
  unrealized_profit_loss_pct: string
  take_profit_price: string | null
  stop_loss_price: string | null
  /** The account this position belongs to. */
  account_id: string | null
  /** Margin reserved at open, and the leverage it was opened at. */
  margin_reserved: string
  leverage: number
  status: PositionStatus
  opened_at: string
  closed_at: string | null
  closing_price: string | null
  realized_profit_loss: string | null
}

export interface OrderCreate {
  symbol: string
  side: OrderSide
  order_type: OrderType
  quantity: number
  price?: number
  stop_price?: number
  take_profit_price?: number
  stop_loss_price?: number
  /** Which book the order is placed against. Always sent — omitting it lets
   * the backend fall back to its demo default, which routed real-account
   * orders at practice cash. */
  account_type: 'demo' | 'real'
  /** The specific account to trade on. */
  account_id?: string
}
