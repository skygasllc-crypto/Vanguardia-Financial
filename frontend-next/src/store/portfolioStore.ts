import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import type { PortfolioSummary } from '@/types/portfolio'

interface PortfolioState {
  summary: PortfolioSummary | null
  isLoading: boolean
  fetchPortfolio: (accountType?: string) => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summary: null,
  isLoading: false,

  fetchPortfolio: async (accountType = 'demo') => {
    set({ isLoading: true })
    try {
      const summary = await api.get<PortfolioSummary>(`/portfolio?account_type=${accountType}`)
      set({ summary, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },
}))
