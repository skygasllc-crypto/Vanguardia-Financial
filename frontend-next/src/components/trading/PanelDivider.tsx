'use client'

import { cn } from '@/lib/cn'

interface PanelDividerProps {
  onPointerDown: () => void
  onNudge: (delta: number) => void
  isDragging: boolean
  label: string
}

/** The draggable seam between two workspace panels.
 *
 * Rendered as a wide invisible hit area over a 1px visual line: a literal 1px
 * target is very hard to grab, but a visibly thick divider eats horizontal
 * space the chart wants. Exposed as a `separator` with arrow-key handling so
 * the layout is adjustable without a pointer. */
export function PanelDivider({ onPointerDown, onNudge, isDragging, label }: PanelDividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        onPointerDown()
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 12
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onNudge(-step)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          onNudge(step)
        }
      }}
      className={cn(
        'group relative hidden w-1.5 shrink-0 cursor-col-resize touch-none xl:block',
        'focus-visible:outline-none',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10 transition-colors',
          'group-hover:bg-accent-500 group-focus-visible:bg-accent-400',
          isDragging && 'bg-accent-500',
        )}
      />
    </div>
  )
}
