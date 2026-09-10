export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled'

export interface Withdrawal {
  id: string
  account_id: string
  currency: string
  /** What was requested, before the fee. */
  amount: string
  fee: string
  /** What the user actually receives. */
  net_amount: string
  method: string
  destination: string
  destination_memo: string | null
  status: WithdrawalStatus
  user_note: string | null
  admin_note: string | null
  rejection_reason: string | null
  transaction_reference: string | null
  created_at: string
  reviewed_at: string | null
  completed_at: string | null
}

export interface AdminWithdrawal extends Withdrawal {
  user_email: string
  user_full_name: string
  account_number: string
}

export interface WithdrawalQuote {
  currency: string
  withdrawable: string
  minimum: string
  fee: string
  net_amount: string
}

export interface WithdrawalCreatePayload {
  account_id: string
  amount: number
  method: string
  destination: string
  destination_memo?: string
  user_note?: string
}
