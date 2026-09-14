import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { activeAccountQuery } from '@/store/accountsStore'
import type { Order, OrderCreate, Trade } from '@/types/trading'

interface OrdersState {
  orders: Order[]
  trades: Trade[]
  isSubmitting: boolean
  /** Orders on the selected account. */
  fetchOrders: () => Promise<void>
  /** Executions on the selected account. */
  fetchTrades: () => Promise<void>
  placeOrder: (payload: OrderCreate) => Promise<Order>
  cancelOrder: (orderId: string) => Promise<void>
  upsertOrder: (order: Order) => void
  addTrade: (trade: Trade) => void
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  trades: [],
  isSubmitting: false,

  // Scoped to the selected account: a real account listing demo orders is the
  // same routing bug seen from the read side.
  fetchOrders: async () => {
    set({ orders: await api.get<Order[]>(`/orders?${activeAccountQuery()}`) })
  },

  fetchTrades: async () => {
    set({ trades: await api.get<Trade[]>(`/trades?${activeAccountQuery()}`) })
  },

  placeOrder: async (payload) => {
    set({ isSubmitting: true })
    try {
      const order = await api.post<Order>('/orders', payload)
      get().upsertOrder(order)
      set({ isSubmitting: false })
      return order
    } catch (err) {
      set({ isSubmitting: false })
      throw err
    }
  },

  cancelOrder: async (orderId) => {
    const order = await api.post<Order>(`/orders/${orderId}/cancel`)
    get().upsertOrder(order)
  },

  upsertOrder: (order) => {
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === order.id)
      if (idx === -1) return { orders: [order, ...state.orders] }
      const next = [...state.orders]
      next[idx] = order
      return { orders: next }
    })
  },

  addTrade: (trade) => {
    set((state) => ({ trades: [trade, ...state.trades] }))
  },
}))
