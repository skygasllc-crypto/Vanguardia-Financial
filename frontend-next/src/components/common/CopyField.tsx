'use client'

import { useState } from 'react'

import { cn } from '@/lib/cn'

/** A value with a one-click copy button.
 *
 * Payout details are transcribed by hand otherwise, and a single mistyped
 * character in a wallet address sends funds somewhere unrecoverable. The full
 * value is exposed to the clipboard even when the display is truncated. */
export function CopyField({
  value,
  label,
  mono = true,
  truncate = true,
  className,
}: {
  value: string
  label?: string
  mono?: boolean
  truncate?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the value is
      // still selectable by hand, so fail quietly rather than alarm.
    }
  }

  return (
    <div className={cn('group flex items-start gap-1.5', className)}>
      <div className="min-w-0">
        {label && <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</span>}
        <span
          title={value}
          className={cn(
            'block text-[11px] text-slate-600',
            mono && 'font-mono',
            truncate ? 'max-w-[220px] truncate' : 'break-all',
          )}
        >
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label ?? 'value'}`}
        className={cn(
          'mt-0.5 shrink-0 rounded p-1 transition-colors',
          copied ? 'text-gain-600' : 'text-slate-400 hover:bg-slate-100 hover:text-navy-700',
        )}
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
