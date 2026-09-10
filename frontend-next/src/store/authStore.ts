import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api } from '@/lib/apiClient'
import type { User } from '@/types/user'

interface RegisterPayload {
  email: string
  username: string
  password: string
  full_name: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  error: string | null

  setTokens: (accessToken: string, refreshToken: string) => void
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  fetchCurrentUser: () => Promise<void>
  clearError: () => void
  setInitializing: (value: boolean) => void
}

// `skipHydration: true` + an explicit `useAuthStore.persist.rehydrate()` call
// from a client-only effect (see AuthHydrator) is used instead of Next.js's
// automatic rehydration on mount. Two reasons: (1) SSR renders with no
// localStorage available, so auto-hydration on mount would otherwise cause a
// server/client markup mismatch for anything gated on isAuthenticated: and
// (2) reading `useAuthStore` (or the shared `api` client, which reads it too)
// from inside a `persist` rehydration callback risks a circular-import TDZ
// bug — calling it before `const useAuthStore = create(...)` below has
// finished assigning throws "Cannot access before initialization" and
// silently aborts hydration. Deferring to an effect after mount sidesteps
// both problems entirely.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitializing: true,
      error: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, isAuthenticated: true }),

      login: async (email, password) => {
        set({ error: null })
        try {
          const tokens = await api.publicPost<{ access_token: string; refresh_token: string }>('/auth/login', { email, password })
          set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, isAuthenticated: true })
          await get().fetchCurrentUser()
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Login failed.' })
          throw err
        }
      },

      register: async (payload) => {
        set({ error: null })
        try {
          await api.publicPost('/auth/register', payload)
          await get().login(payload.email, payload.password)
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Registration failed.' })
          throw err
        }
      },

      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      fetchCurrentUser: async () => {
        const user = await api.get<User>('/auth/me')
        set({ user, isAuthenticated: true })
      },

      clearError: () => set({ error: null }),
      setInitializing: (value) => set({ isInitializing: value }),
    }),
    {
      name: 'vanguard-auth',
      skipHydration: true,
      partialize: (state) => ({ accessToken: state.accessToken, refreshToken: state.refreshToken }),
    },
  ),
)
