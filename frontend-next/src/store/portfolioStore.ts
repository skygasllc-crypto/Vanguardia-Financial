import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { activeAccountQuery } from '@/store/accountsStore'
import type { PortfolioSummary } from '@/types/portfolio'

interface PortfolioState {
  summary: PortfolioSummary | null
  isLoading: boolean
  /** Portfolio of the selected account. */
  fetchPortfolio: () => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summary: null,
  isLoading: false,

  fetchPortfolio: async () => {
    set({ isLoading: true })
    try {
      // Always the selected account, so a demo and a real account each report
      // their own portfolio rather than whichever one loaded first.
      const summary = await api.get<PortfolioSummary>(`/portfolio?${activeAccountQuery()}`)
      set({ summary, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },
}))
