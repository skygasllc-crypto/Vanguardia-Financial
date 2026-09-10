'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { ChevronDownIcon } from '@/components/layout/icons'
import { MEGA_MENU } from '@/components/layout/megaMenuData'
import { cn } from '@/lib/cn'

// Tailwind needs each class string to appear literally somewhere for its
// static analysis to include it in the build — keyed by column count so the
// panel scales with how many columns a given menu item actually has.
const PANEL_MAX_WIDTH: Record<number, string> = {
  2: 'max-w-lg',
  3: 'max-w-2xl',
  4: 'max-w-3xl',
  5: 'max-w-5xl',
}
const PANEL_GRID_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

/** Desktop mega menu: a handful of top-level triggers, each opening a
 * multi-column panel of links. Opens on hover or click, closes on Escape,
 * outside click, or selecting a link — standard disclosure-menu behavior. */
export function MegaMenu() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  function openNow(index: number) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenIndex(index)
  }

  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenIndex(null), 150)
  }

  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenIndex(null)
  }

  useEffect(() => {
    if (openIndex === null) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeNow()
    }
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeNow()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex])

  return (
    <div ref={rootRef} className="hidden items-center gap-1 md:flex" aria-label="Primary" onMouseLeave={closeSoon}>
      {MEGA_MENU.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div key={item.label} className="relative z-50" onMouseEnter={() => openNow(index)}>
            <button
              type="button"
              className={cn(
                'relative z-50 flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-navy-900',
                isOpen && 'text-navy-900',
              )}
              aria-haspopup="true"
              aria-expanded={isOpen}
              onClick={() => (isOpen ? closeNow() : openNow(index))}
            >
              {item.label}
              <ChevronDownIcon className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {/* Always mounted (not conditionally rendered) so every link stays
                in the DOM for crawlers and assistive tech — visibility is
                purely visual/interactive, toggled via classes + aria-hidden. */}
            <div
              className={cn(
                'absolute left-1/2 top-full z-50 mt-2 w-screen -translate-x-1/3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card-lg)] transition-opacity',
                PANEL_MAX_WIDTH[item.columns.length] ?? 'max-w-3xl',
                isOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
              )}
              role="menu"
              aria-hidden={!isOpen}
            >
              <div className={cn('grid grid-cols-2 gap-x-8 gap-y-6', PANEL_GRID_COLS[item.columns.length] ?? 'lg:grid-cols-4')}>
                {item.columns.map((column) => (
                  <div key={column.heading}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{column.heading}</h3>
                    <ul className="mt-3 space-y-2.5">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            role="menuitem"
                            tabIndex={isOpen ? 0 : -1}
                            onClick={closeNow}
                            className="text-sm font-medium text-slate-600 transition-colors hover:text-accent-600"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
