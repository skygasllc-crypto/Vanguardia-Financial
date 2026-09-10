'use client'

import { useEffect } from 'react'

import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'

/** Renders nothing — runs once on mount to rehydrate the persisted auth
 * tokens (skipped automatically during SSR) and validate them against the
 * backend. See the comment on `useAuthStore` for why this isn't done via
 * `persist`'s built-in auto-rehydration. */
export function AuthHydrator() {
  useEffect(() => {
    useAuthStore.persist.rehydrate()
    const { accessToken, fetchCurrentUser, logout, setInitializing } = useAuthStore.getState()

    if (!accessToken) {
      setInitializing(false)
      return
    }

    fetchCurrentUser()
      // Only a genuine auth failure (invalid/expired token) should log the
      // user out — a transient network error shouldn't wipe a valid session.
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout()
      })
      .finally(() => setInitializing(false))
  }, [])

  return null
}
