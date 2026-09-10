'use client'

import { useEffect } from 'react'

/** Runs `callback` immediately and then every `intervalMs`, for data that
 * has no WebSocket event of its own yet (e.g. periodic re-sync fallback). */
export function usePolling(callback: () => void, intervalMs: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    callback()
    const id = setInterval(callback, intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled])
}
