'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface PanelSizes {
  /** Watchlist / category rail width in px. */
  left: number
  /** Order book + tape width in px. */
  right: number
}

interface Options {
  storageKey: string
  initial: PanelSizes
  min: PanelSizes
  max: PanelSizes
  /** Ceiling for each panel as a share of viewport width (0-1). The panels
   * give way before the chart does as the window narrows. */
  maxViewportShare?: PanelSizes
}

const DEFAULT_VIEWPORT_SHARE: PanelSizes = { left: 0.16, right: 0.2 }

/** Drag-to-resize state for the trading workspace's side panels.
 *
 * Widths are px rather than fractions because the side panels hold fixed-width
 * numeric columns — a percentage split reflows them into wrapping at awkward
 * viewport sizes, while the centre chart is happy to absorb whatever is left.
 *
 * Sizes persist per browser via localStorage. Reads and writes are wrapped
 * because a private window or blocked site-data setting makes the accessor
 * itself throw, and a terminal that refuses to render is worse than one that
 * forgets its layout. */
export function useResizablePanels({
  storageKey,
  initial,
  min,
  max,
  maxViewportShare = DEFAULT_VIEWPORT_SHARE,
}: Options) {
  // The width the user chose. Kept whole so widening the window restores it
  // rather than leaving the panel stuck at whatever a narrow viewport allowed.
  const [sizes, setSizes] = useState<PanelSizes>(initial)
  const [viewport, setViewport] = useState<number | null>(null)
  const [dragging, setDragging] = useState<keyof PanelSizes | null>(null)
  // Read on mount rather than in useState's initialiser: the server render has
  // no localStorage, and seeding from it directly would mismatch on hydration.
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<PanelSizes>
      // Reading persisted layout is exactly the "subscribe to an external
      // system" case the rule carves out, but it cannot be expressed as a lazy
      // initialiser: localStorage does not exist during the server render, and
      // seeding from it there would desync hydration. Runs once, on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSizes((prev) => ({
        left: clamp(Number(saved.left) || prev.left, min.left, max.left),
        right: clamp(Number(saved.right) || prev.right, min.right, max.right),
      }))
    } catch {
      // Corrupt or unreadable — keep the defaults.
    }
  }, [storageKey, min.left, min.right, max.left, max.right])

  useEffect(() => {
    const read = () => setViewport(window.innerWidth)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  const persist = useCallback(
    (next: PanelSizes) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Storage unavailable; the layout still works for this session.
      }
    },
    [storageKey],
  )

  const startDrag = useCallback((panel: keyof PanelSizes) => setDragging(panel), [])

  useEffect(() => {
    if (!dragging) return

    function onMove(e: PointerEvent) {
      setSizes((prev) => {
        // The right panel grows as the pointer moves left, so its delta is
        // measured from the viewport edge rather than from the origin.
        const raw = dragging === 'left' ? e.clientX : window.innerWidth - e.clientX
        // Clamped against the viewport cap too, so the divider stops where the
        // panel actually stops instead of drifting away from the pointer.
        const ceiling = viewportCeiling(max[dragging!], min[dragging!], window.innerWidth, maxViewportShare[dragging!])
        return { ...prev, [dragging as keyof PanelSizes]: clamp(raw, min[dragging!], ceiling) }
      })
    }

    function onUp() {
      setDragging(null)
      setSizes((current) => {
        persist(current)
        return current
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    // Suppress text selection and let the resize cursor win for the whole drag.
    const prevUserSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = prevUserSelect
      document.body.style.cursor = prevCursor
    }
  }, [dragging, min, max, maxViewportShare, persist])

  const resetSizes = useCallback(() => {
    setSizes(initial)
    persist(initial)
  }, [initial, persist])

  /** Keyboard resizing, so the split is reachable without a pointer. */
  const nudge = useCallback(
    (panel: keyof PanelSizes, delta: number) => {
      setSizes((prev) => {
        const ceiling = viewportCeiling(max[panel], min[panel], window.innerWidth, maxViewportShare[panel])
        const next = { ...prev, [panel]: clamp(prev[panel] + delta, min[panel], ceiling) }
        persist(next)
        return next
      })
    },
    [min, max, maxViewportShare, persist],
  )

  // What actually gets rendered: the stored preference, capped to a share of
  // the current viewport. Null viewport means the server render, where there
  // is no window to measure — fall back to the stored width so the markup
  // matches on hydration.
  const effective: PanelSizes = {
    left: capToViewport(sizes.left, min.left, viewport, maxViewportShare.left),
    right: capToViewport(sizes.right, min.right, viewport, maxViewportShare.right),
  }

  return { sizes: effective, dragging, startDrag, nudge, resetSizes }
}

/** The largest a panel may be right now: its configured max, further limited
 * by its share of the viewport, but never pushed below its own minimum. */
function viewportCeiling(maxWidth: number, minWidth: number, viewport: number, share: number): number {
  return Math.max(minWidth, Math.min(maxWidth, Math.round(viewport * share)))
}

/** Cap a panel to its share of the viewport, never below its own minimum —
 * a panel squeezed past that stops being readable, at which point the layout
 * should stack instead (which it does below the xl breakpoint). */
function capToViewport(width: number, minWidth: number, viewport: number | null, share: number): number {
  if (viewport === null) return width
  return Math.max(minWidth, Math.min(width, Math.round(viewport * share)))
}

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), high)
}
