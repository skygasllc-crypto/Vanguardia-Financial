import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { useAccountTypeStore } from '@/store/accountTypeStore'
import type { AccountType, Order, OrderCreate, Trade } from '@/types/trading'

interface OrdersState {
  orders: Order[]
  trades: Trade[]
  isSubmitting: boolean
  fetchOrders: (accountType?: AccountType) => Promise<void>
  fetchTrades: (accountType?: AccountType) => Promise<void>
  placeOrder: (payload: OrderCreate) => Promise<Order>
  cancelOrder: (orderId: string) => Promise<void>
  upsertOrder: (order: Order) => void
  addTrade: (trade: Trade) => void
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  trades: [],
  isSubmitting: false,

  // Scoped to a book when given one: a real account listing demo orders is
  // the same routing bug seen from the read side.
  fetchOrders: async (accountType) => {
    const book = accountType ?? useAccountTypeStore.getState().accountType
    set({ orders: await api.get<Order[]>(`/orders?account_type=${book}`) })
  },

  fetchTrades: async (accountType) => {
    const book = accountType ?? useAccountTypeStore.getState().accountType
    set({ trades: await api.get<Trade[]>(`/trades?account_type=${book}`) })
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
