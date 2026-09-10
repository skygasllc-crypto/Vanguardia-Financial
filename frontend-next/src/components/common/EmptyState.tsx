import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center', className)}>
      <h4 className="text-sm font-semibold text-navy-800">{title}</h4>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
