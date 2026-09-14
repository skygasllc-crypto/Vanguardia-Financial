import type { PositionStatus } from './trading'
import type { RiskStatus, UserStatus } from './user'

export interface AdminUserRow {
  id: string
  display_id: string // User-facing ID (e.g., AB1234)
  full_name: string
  email: string
  username: string
  status: UserStatus
  is_verified: boolean
  created_at: string
  last_login_at: string | null
  available_balance: string
  locked_balance: string
  total_account_value: string
  total_deposits: string
  total_withdrawals: string
  total_realized_pnl: string
  total_unrealized_pnl: string
  total_trading_volume: string
  open_positions_count: number
  open_orders_count: number
  currency: string
  risk_status: RiskStatus
}

export interface AdminUserFinancialProfile {
  user: AdminUserRow
  recent_orders: Record<string, unknown>[]
  open_orders: Record<string, unknown>[]
  trade_history: Record<string, unknown>[]
  position_history: Record<string, unknown>[]
  ledger_entries: Record<string, unknown>[]
  login_history: Record<string, unknown>[]
  active_sessions: Record<string, unknown>[]
}

export interface BalanceAdjustmentRequest {
  adjustment_type: 'credit' | 'debit'
  /** Target account; omitted, the backend uses the user's real account. */
  account_id?: string
  amount: number
  currency: string
  reason: string
  internal_reference?: string
  notes?: string
}

export interface AdminPosition {
  id: string
  user_id: string
  asset_name: string
  symbol: string
  quantity: string
  entry_price: string
  admin_current_price: string
  invested_amount: string
  admin_current_value: string
  admin_profit_loss: string
  admin_profit_loss_pct: string
  position_status: PositionStatus
  updated_at: string
}

export interface AdminPositionCreate {
  user_id: string
  asset_name: string
  symbol: string
  quantity: number
  entry_price: number
  admin_current_price: number
  invested_amount: number
  admin_current_value: number
  admin_profit_loss: number
  admin_profit_loss_pct: number
  position_status: PositionStatus
}

export interface UserFinancialSettings {
  is_active: boolean
  total_account_balance: number
  available_balance: number
  portfolio_value: number
  total_profit: number
  total_loss: number
  net_profit_loss: number
  total_invested_amount: number
  daily_profit_loss: number
  profit_loss_percentage: number
  currency: string
}

export interface AdminDashboardStats {
  total_users: number
  active_users: number
  total_trading_volume: string
  open_orders_count: number
  recent_registrations: Record<string, unknown>[]
  recent_trades: Record<string, unknown>[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
