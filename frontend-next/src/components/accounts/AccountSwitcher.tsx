'use client'

import { useEffect, useState } from 'react'

import { useAccountsStore } from '@/store/accountsStore'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

/** Picks the account the terminal trades on.
 *
 * Replaces the old demo/real toggle: with several accounts of each type, a
 * two-way switch can no longer say which one an order lands on. */
export function AccountSwitcher({ dark = false }: { dark?: boolean }) {
  const accounts = useAccountsStore((s) => s.accounts)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (accounts.length === 0) fetchAccounts().catch(() => undefined)
  }, [accounts.length, fetchAccounts])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const active = accounts.find((a) => a.id === activeAccountId)
  if (!active) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-colors',
          dark
            ? 'border-white/10 bg-white/5 hover:bg-white/10'
            : 'border-slate-200 bg-white hover:border-slate-300',
        )}
      >
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            active.account_type === 'real' ? 'bg-gain-500' : 'bg-slate-400',
          )}
        />
        <span className="min-w-0">
          <span className={cn('block font-mono text-xs font-bold', dark ? 'text-white' : 'text-navy-900')}>
            {active.account_number}
          </span>
          <span className={cn('block text-[10px] tabular-nums', dark ? 'text-slate-400' : 'text-slate-500')}>
            {formatCurrency(active.equity, active.currency)} · 1:{active.leverage}
          </span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={dark ? 'text-slate-400' : 'text-slate-500'} aria-hidden>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-card-lg)]"
          >
            {accounts.map((a) => (
              <button
                key={a.id}
                role="menuitem"
                onClick={() => {
                  setActiveAccount(a.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  a.id === activeAccountId ? 'bg-accent-50' : 'hover:bg-slate-50',
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', a.account_type === 'real' ? 'bg-gain-500' : 'bg-slate-400')}
                    />
                    <span className="font-mono text-xs font-bold text-navy-900">{a.account_number}</span>
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {a.label || (a.account_type === 'demo' ? 'Practice' : 'Live')} · 1:{a.leverage}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-semibold tabular-nums text-navy-900">
                    {formatCurrency(a.equity, a.currency)}
                  </span>
                  {a.open_positions > 0 && (
                    <span className="block text-[10px] text-slate-400">{a.open_positions} open</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
