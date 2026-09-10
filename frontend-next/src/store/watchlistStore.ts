import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import type { WatchlistItem } from '@/types/watchlist'

interface WatchlistState {
  items: WatchlistItem[]
  isLoading: boolean
  fetchWatchlist: () => Promise<void>
  addToWatchlist: (assetId: string) => Promise<void>
  removeFromWatchlist: (itemId: string) => Promise<void>
  isWatched: (symbol: string) => boolean
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchWatchlist: async () => {
    set({ isLoading: true })
    try {
      const items = await api.get<WatchlistItem[]>('/watchlist')
      set({ items, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  addToWatchlist: async (assetId) => {
    const item = await api.post<WatchlistItem>('/watchlist', { asset_id: assetId })
    set((state) => ({ items: [...state.items, item] }))
  },

  removeFromWatchlist: async (itemId) => {
    await api.delete(`/watchlist/${itemId}`)
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }))
  },

  isWatched: (symbol) => get().items.some((i) => i.asset.symbol === symbol),
}))
