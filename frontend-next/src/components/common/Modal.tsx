'use client'

import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        /* Capped to the viewport with the body as the scroll container. Without
           this a tall dialog — an order ticket with the exit brackets expanded,
           say — overflows past the bottom of the screen, and because the
           backdrop is fixed there is nothing to scroll: the submit button
           becomes unreachable. 100dvh rather than 100vh so mobile browser
           chrome does not hide the last row. */
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-2xl bg-white shadow-[var(--shadow-card-lg)]"
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-navy-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-700"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
