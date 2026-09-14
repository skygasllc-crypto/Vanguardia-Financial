'use client'

import { useAccountTypeStore } from '@/store/accountTypeStore'
import { cn } from '@/lib/utils'

export function AccountTypeSwitcher() {
  const accountType = useAccountTypeStore((s) => s.accountType)
  const setAccountType = useAccountTypeStore((s) => s.setAccountType)

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      <button
        onClick={() => setAccountType('demo')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-all',
          accountType === 'demo'
            ? 'bg-navy-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-navy-900'
        )}
      >
        <span className="mr-2">📊</span>
        DEMO
      </button>
      <button
        onClick={() => setAccountType('real')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-all',
          accountType === 'real'
            ? 'bg-navy-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-navy-900'
        )}
      >
        <span className="mr-2">💰</span>
        REAL
      </button>
    </div>
  )
}
