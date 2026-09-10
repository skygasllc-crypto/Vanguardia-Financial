'use client'

import { useWsStore } from '@/store/wsStore'
import { cn } from '@/lib/cn'

export function LiveIndicator({ className }: { className?: string }) {
  const status = useWsStore((s) => s.status)

  const label = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'
  const dotColor = status === 'connected' ? 'bg-gain-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-slate-300'

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-slate-500', className)}>
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dotColor)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)} />
      </span>
      {label}
    </span>
  )
}
