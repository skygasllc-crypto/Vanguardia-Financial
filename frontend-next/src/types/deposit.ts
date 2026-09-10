export type DepositStatus = 'pending' | 'user_paid' | 'confirming' | 'confirmed' | 'credited' | 'failed' | 'cancelled'

export interface DepositWallet {
  id: string
  currency_id: string
  currency_name: string
  currency_symbol: string
  network: string
  network_fee: string
  icon: string
  wallet_address: string
  memo_tag?: string | null
  is_active: boolean
  minimum_deposit?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Deposit {
  id: string
  user_id: string
  currency_id: string
  currency_symbol: string
  network: string
  deposit_address: string
  transaction_hash?: string | null
  amount: string
  network_fee?: string | null
  credited_amount?: string | null
  status: DepositStatus
  confirmations: number
  required_confirmations: number
  admin_notes?: string | null
  user_marked_paid_at?: string | null
  admin_confirmed_by?: string | null
  admin_confirmed_at?: string | null
  created_at: string
  updated_at: string
}

export interface DepositListResponse {
  deposits: Deposit[]
  total: number
  page: number
  per_page: number
}

export interface CreateDepositRequest {
  currency_id: string
  amount?: number
}
