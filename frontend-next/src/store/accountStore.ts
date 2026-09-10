import { create } from 'zustand'

import { api } from '@/lib/apiClient'
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
      const wallet = await api.get<WalletSummary>('/wallet')
      set({ wallet, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  fetchTransactions: async () => {
    const transactions = await api.get<LedgerEntry[]>('/wallet/transactions')
    set({ transactions })
  },

  applyBalanceUpdate: (payload) => {
    set((state) => ({
      wallet: state.wallet ? { ...state.wallet, ...payload } : { ...payload, is_simulated: false },
    }))
  },
}))
