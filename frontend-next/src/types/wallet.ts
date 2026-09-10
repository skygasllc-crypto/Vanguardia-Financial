export type TransactionType =
  | 'TRADE_BUY'
  | 'TRADE_SELL'
  | 'POSITION_CLOSE'
  | 'ADMIN_CREDIT'
  | 'ADMIN_DEBIT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'

export interface LedgerEntry {
  id: string
  transaction_ref: string
  transaction_type: TransactionType
  amount: string
  currency: string
  balance_before: string
  balance_after: string
  description: string | null
  created_at: string
}

export interface WalletSummary {
  available_balance: string
  locked_balance: string
  currency: string
  is_simulated: boolean
}
