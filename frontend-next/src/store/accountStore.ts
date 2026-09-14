import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { activeAccountQuery } from '@/store/accountsStore'
import type { LedgerEntry, WalletSummary } from '@/types/wallet'

interface AccountState {
  wallet: WalletSummary | null
  transactions: LedgerEntry[]
  isLoading: boolean
  fetchWallet: () => Promise<void>
  fetchTransactions: () => Promise<void>
  applyBalanceUpdate: (payload: { available_balance: string; locked_balance: string; currency: string }) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  wallet: null,
  transactions: [],
  isLoading: false,

  fetchWallet: async () => {
    set({ isLoading: true })
    try {
      // Both scoped to the selected account: unscoped, the wallet reported the
      // primary demo account and the ledger mixed every account together.
      const wallet = await api.get<WalletSummary>(`/wallet?${activeAccountQuery()}`)
      set({ wallet, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  fetchTransactions: async () => {
    const transactions = await api.get<LedgerEntry[]>(`/wallet/transactions?${activeAccountQuery()}`)
    set({ transactions })
  },

  applyBalanceUpdate: (payload) => {
    set((state) => ({
      wallet: state.wallet ? { ...state.wallet, ...payload } : { ...payload, is_simulated: false },
    }))
  },
}))
