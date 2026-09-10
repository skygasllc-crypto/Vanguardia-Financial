import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)} role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-accent-500" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-100', className)} />
}
