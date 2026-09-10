import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import type { AccountCreatePayload, EquityPoint, TradingAccount } from '@/types/account'
import type { Order, Position } from '@/types/trading'
import type { LedgerEntry } from '@/types/wallet'

interface AccountsState {
  accounts: TradingAccount[]
  /** The account trading acts on. Null until the list first loads. */
  activeAccountId: string | null
  isLoading: boolean
  fetchAccounts: () => Promise<void>
  createAccount: (payload: AccountCreatePayload) => Promise<TradingAccount>
  setActiveAccount: (accountId: string) => void
  renameAccount: (accountId: string, label: string) => Promise<void>
  fetchEquityCurve: (accountId: string, days?: number) => Promise<EquityPoint[]>
  fetchTransactions: (accountId: string) => Promise<LedgerEntry[]>
  fetchOrders: (accountId: string) => Promise<Order[]>
  fetchPositions: (accountId: string) => Promise<Position[]>
  getActiveAccount: () => TradingAccount | undefined
}

const ACTIVE_KEY = 'vg.activeAccountId'

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true })
    try {
      const accounts = await api.get<TradingAccount[]>('/accounts')
      // Keep the current selection if it still exists, otherwise fall back to
      // the primary account so the app is never pointed at nothing.
      const current = get().activeAccountId
      const stored = current ?? readStoredActive()
      const stillValid = accounts.some((a) => a.id === stored)
      const fallback = accounts.find((a) => a.is_primary) ?? accounts[0]
      set({
        accounts,
        activeAccountId: stillValid ? stored : (fallback?.id ?? null),
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  createAccount: async (payload) => {
    const account = await api.post<TradingAccount>('/accounts', payload)
    set((s) => ({ accounts: [...s.accounts, account] }))
    return account
  },

  setActiveAccount: (accountId) => {
    set({ activeAccountId: accountId })
    try {
      window.localStorage.setItem(ACTIVE_KEY, accountId)
    } catch {
      // Storage unavailable; the choice still holds for this session.
    }
  },

  renameAccount: async (accountId, label) => {
    const updated = await api.patch<TradingAccount>(`/accounts/${accountId}`, { label })
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === updated.id ? updated : a)) }))
  },

  fetchEquityCurve: async (accountId, days = 30) =>
    api.get<EquityPoint[]>(`/accounts/${accountId}/equity?days=${days}`),

  fetchTransactions: async (accountId) => api.get<LedgerEntry[]>(`/accounts/${accountId}/transactions`),
  fetchOrders: async (accountId) => api.get<Order[]>(`/accounts/${accountId}/orders`),
  fetchPositions: async (accountId) => api.get<Position[]>(`/accounts/${accountId}/positions`),

  getActiveAccount: () => {
    const { accounts, activeAccountId } = get()
    return accounts.find((a) => a.id === activeAccountId)
  },
}))

function readStoredActive(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}
