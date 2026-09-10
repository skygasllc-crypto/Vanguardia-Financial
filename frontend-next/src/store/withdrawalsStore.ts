import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import type { Withdrawal, WithdrawalCreatePayload, WithdrawalQuote } from '@/types/withdrawal'

interface WithdrawalsState {
  withdrawals: Withdrawal[]
  isLoading: boolean
  fetchWithdrawals: (accountId?: string) => Promise<void>
  requestWithdrawal: (payload: WithdrawalCreatePayload) => Promise<Withdrawal>
  cancelWithdrawal: (id: string) => Promise<void>
  fetchQuote: (accountId: string, method: string, amount: number) => Promise<WithdrawalQuote>
}

export const useWithdrawalsStore = create<WithdrawalsState>((set) => ({
  withdrawals: [],
  isLoading: false,

  fetchWithdrawals: async (accountId) => {
    set({ isLoading: true })
    try {
      const query = accountId ? `?account_id=${accountId}` : ''
      set({ withdrawals: await api.get<Withdrawal[]>(`/withdrawals${query}`), isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  requestWithdrawal: async (payload) => {
    const withdrawal = await api.post<Withdrawal>('/withdrawals', payload)
    set((s) => ({ withdrawals: [withdrawal, ...s.withdrawals] }))
    return withdrawal
  },

  cancelWithdrawal: async (id) => {
    const updated = await api.post<Withdrawal>(`/withdrawals/${id}/cancel`)
    set((s) => ({ withdrawals: s.withdrawals.map((w) => (w.id === updated.id ? updated : w)) }))
  },

  fetchQuote: async (accountId, method, amount) =>
    api.get<WithdrawalQuote>(`/withdrawals/quote?account_id=${accountId}&method=${method}&amount=${amount}`),
}))
