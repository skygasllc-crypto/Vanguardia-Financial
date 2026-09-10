import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import type { AssetCategoryCount, AssetDetail, AssetSummary, AssetType, MarketCategory, MarketDataStatus } from '@/types/market'

interface PriceTick {
  symbol: string
  price: string
  change_24h_pct: string
  high_24h: string
  low_24h: string
}

export interface MarketQuery {
  category?: MarketCategory
  assetType?: AssetType
  region?: string
  search?: string
  limit?: number
  offset?: number
}

interface MarketState {
  assets: Record<string, AssetSummary>
  isLoading: boolean
  dataStatus: MarketDataStatus | null
  categories: AssetCategoryCount[]
  fetchCategories: () => Promise<void>
  fetchMarkets: (category?: MarketCategory, assetType?: AssetType, search?: string) => Promise<AssetSummary[]>
  queryMarkets: (query: MarketQuery) => Promise<AssetSummary[]>
  fetchAssetDetail: (symbol: string) => Promise<AssetDetail>
  fetchDataStatus: () => Promise<void>
  applyPriceTick: (tick: PriceTick) => void
  getAsset: (symbol: string) => AssetSummary | undefined
}

export const useMarketStore = create<MarketState>((set, get) => ({
  assets: {},
  isLoading: false,
  dataStatus: null,
  categories: [],

  fetchCategories: async () => {
    if (get().categories.length > 0) return
    try {
      set({ categories: await api.publicGet<AssetCategoryCount[]>('/markets/categories') })
    } catch {
      // Non-critical: the rail falls back to unlabelled tabs without counts.
    }
  },

  fetchDataStatus: async () => {
    if (get().dataStatus) return
    try {
      const dataStatus = await api.publicGet<MarketDataStatus>('/markets/status')
      set({ dataStatus })
    } catch {
      // Non-critical: the UI falls back to a neutral label if this fails.
    }
  },

  fetchMarkets: async (category, assetType, search) =>
    get().queryMarkets({ category, assetType, search }),

  queryMarkets: async ({ category, assetType, region, search, limit, offset }) => {
    set({ isLoading: true })
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (assetType) params.set('asset_type', assetType)
    if (region) params.set('region', region)
    if (search) params.set('search', search)
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const query = params.toString() ? `?${params.toString()}` : ''
    try {
      const list = await api.publicGet<AssetSummary[]>(`/markets${query}`)
      set((state) => ({
        assets: { ...state.assets, ...Object.fromEntries(list.map((a) => [a.symbol, a])) },
        isLoading: false,
      }))
      return list
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  fetchAssetDetail: async (symbol) => {
    const detail = await api.publicGet<AssetDetail>(`/markets/${symbol}`)
    set((state) => ({ assets: { ...state.assets, [detail.symbol]: detail } }))
    return detail
  },

  applyPriceTick: (tick) => {
    set((state) => {
      const existing = state.assets[tick.symbol]
      if (!existing) return state
      return {
        assets: {
          ...state.assets,
          [tick.symbol]: { ...existing, current_price: tick.price, change_24h_pct: tick.change_24h_pct },
        },
      }
    })
  },

  getAsset: (symbol) => get().assets[symbol],
}))
