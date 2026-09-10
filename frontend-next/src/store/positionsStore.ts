import { create } from 'zustand'

import { api } from '@/lib/apiClient'
import { useAccountTypeStore } from '@/store/accountTypeStore'
import type { AccountType, Position } from '@/types/trading'

interface PositionsState {
  positions: Position[]
  isLoading: boolean
  fetchPositions: (accountType?: AccountType) => Promise<void>
  closePosition: (positionId: string) => Promise<void>
  upsertPosition: (position: Partial<Position> & { id: string }) => void
  /** Mark a position closed in place. */
  markClosed: (position: Partial<Position> & { id: string }) => void
  removePosition: (positionId: string) => void
}

/** Positions the user holds, open and closed.
 *
 * Closed positions stay in the collection rather than being dropped: a row
 * that silently disappears the moment it closes reads as a glitch, and leaves
 * no record of the outcome on screen. Consumers filter by `status` to decide
 * what to show. */
export const usePositionsStore = create<PositionsState>((set, get) => ({
  positions: [],
  isLoading: false,

  fetchPositions: async (accountType) => {
    // Defaults to whichever book the user is currently on, so callers that
    // don't thread it through (the app shell's initial load, websocket-driven
    // refreshes) still read the right one instead of both interleaved.
    const book = accountType ?? useAccountTypeStore.getState().accountType
    set({ isLoading: true })
    try {
      // No status filter: the panel needs both the live book and the recently
      // closed trades that feed the history tab. Scoped to one account though —
      // demo and real are separate books and must not be shown interleaved.
      const positions = await api.get<Position[]>(`/positions?account_type=${book}`)
      set({ positions, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  closePosition: async (positionId) => {
    const closed = await api.post<Position>(`/positions/${positionId}/close`)
    get().markClosed(closed)
  },

  upsertPosition: (partial) => {
    set((state) => {
      const idx = state.positions.findIndex((p) => p.id === partial.id)
      if (idx === -1) return state
      const next = [...state.positions]
      next[idx] = { ...next[idx], ...partial }
      return { positions: next }
    })
  },

  markClosed: (partial) => {
    set((state) => {
      const idx = state.positions.findIndex((p) => p.id === partial.id)
      const closedFields: Partial<Position> = {
        ...partial,
        status: 'closed',
        // A closed position has no unrealised component left; leaving the last
        // live value in place would keep it ticking against the market.
        unrealized_profit_loss: '0',
        unrealized_profit_loss_pct: '0',
      }
      if (idx === -1) {
        // Closed elsewhere (another tab, an admin action) before this client
        // ever loaded the row — pull the authoritative list rather than
        // fabricating one from a partial payload.
        void get().fetchPositions().catch(() => undefined)
        return state
      }
      const next = [...state.positions]
      next[idx] = { ...next[idx], ...closedFields }
      return { positions: next }
    })
  },

  removePosition: (positionId) => {
    set((state) => ({ positions: state.positions.filter((p) => p.id !== positionId) }))
  },
}))
