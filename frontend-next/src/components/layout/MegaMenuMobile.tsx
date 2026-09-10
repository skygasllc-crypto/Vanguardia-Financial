'use client'

import { useState } from 'react'
import Link from 'next/link'

import { ChevronDownIcon } from '@/components/layout/icons'
import { MEGA_MENU } from '@/components/layout/megaMenuData'
import { cn } from '@/lib/cn'

/** Accordion form of the mega menu for the mobile nav drawer — each
 * top-level item expands in place rather than opening a hover panel. */
export function MegaMenuMobile({ onNavigate }: { onNavigate: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {MEGA_MENU.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div key={item.label} className="py-1.5">
            <button
              type="button"
              className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-navy-800"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              {item.label}
              <ChevronDownIcon className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-2 pt-1">
                {item.columns.map((column) => (
                  <div key={column.heading}>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{column.heading}</h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href} onClick={onNavigate} className="text-sm text-slate-600">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
