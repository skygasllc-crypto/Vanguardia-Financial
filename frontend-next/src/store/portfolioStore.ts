import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { useAccountsStore } from '@/store/accountsStore'
import type { PortfolioSummary } from '@/types/portfolio'

interface PortfolioState {
  summary: PortfolioSummary | null
  isLoading: boolean
  fetchPortfolio: (accountType?: string, accountId?: string) => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summary: null,
  isLoading: false,

  fetchPortfolio: async (accountType = 'demo', accountId) => {
    set({ isLoading: true })
    try {
      // Falls back to the currently selected account, so the dashboard reports
      // the same account the rest of the app is pointed at rather than the
      // primary one of its type.
      const id = accountId ?? useAccountsStore.getState().activeAccountId
      const query = id ? `?account_id=${id}` : `?account_type=${accountType}`
      const summary = await api.get<PortfolioSummary>(`/portfolio${query}`)
      set({ summary, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },
}))
