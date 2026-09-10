export type AccountType = 'demo' | 'real'

/** One trading account, with its live margin picture.
 *
 * A user may hold several of each type; `account_number` is the stable public
 * identifier and `label` is their own name for it. */
export interface TradingAccount {
  id: string
  account_number: string
  label: string | null
  currency: string
  account_type: AccountType
  is_primary: boolean
  is_active: boolean

  /** Settled cash, credits included. */
  balance: string
  /** Locked behind a pending or approved withdrawal. */
  held: string
  bonus: string
  /** Balance less outstanding bonus and reserved margin. */
  withdrawable: string
  /** Balance plus unrealised P&L. */
  equity: string

  leverage: number
  margin_used: string
  free_margin: string
  /** equity / margin_used as a percentage. Null when nothing is open — which
   * is not the same as zero, and must not be rendered as a margin problem. */
  margin_level: string | null
  margin_call: boolean
  stop_out: boolean

  unrealized_pnl: string
  realized_pnl: string
  total_pnl: string
  open_positions: number
  created_at: string
}

export interface EquityPoint {
  taken_at: string
  balance: string
  equity: string
  margin_used: string
  unrealized_pnl: string
  realized_pnl: string
}

export interface AccountCreatePayload {
  account_type: AccountType
  label?: string
  currency?: string
}
