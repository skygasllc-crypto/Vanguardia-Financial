'use client'

import { useEffect } from 'react'

import { websocketService } from '@/lib/websocketService'
import { useAuthStore } from '@/store/authStore'

/** Opens the live WebSocket connection for the duration a user is
 * authenticated, and closes it on logout / unmount. Mount once, near the
 * root of the authenticated app shell. */
export function useWebSocketLifecycle(): void {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      websocketService.connect(accessToken)
    } else {
      websocketService.disconnect()
    }
    return () => websocketService.disconnect()
  }, [isAuthenticated, accessToken])
}
