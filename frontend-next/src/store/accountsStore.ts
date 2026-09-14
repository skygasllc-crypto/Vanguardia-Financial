import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { useAccountTypeStore } from '@/store/accountTypeStore'
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
      syncAccountType(get().getActiveAccount())
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
    syncAccountType(get().accounts.find((a) => a.id === accountId))
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

/** Keeps the demo/real book in step with the selected account. It was a
 * separate setting with no control left to change it, so it stayed on demo:
 * a user on a real account saw that account's balance beside demo positions. */
function syncAccountType(account: TradingAccount | undefined): void {
  if (account) useAccountTypeStore.getState().setAccountType(account.account_type)
}

/** Query string scoping a request to the selected account, so each account —
 * demo or real — reads its own portfolio, positions, orders and ledger. Falls
 * back to the book only before the account list has loaded. */
export function activeAccountQuery(): string {
  const id = useAccountsStore.getState().activeAccountId
  return id ? `account_id=${id}` : `account_type=${useAccountTypeStore.getState().accountType}`
}

function readStoredActive(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}
