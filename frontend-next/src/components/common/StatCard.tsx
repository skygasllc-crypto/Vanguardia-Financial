import type { ReactNode } from 'react'

import { Card } from '@/components/common/Card'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  hint?: string
  className?: string
}

export function StatCard({ label, value, delta, hint, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-display text-2xl font-bold tabular-nums text-navy-900 sm:text-[28px]">{value}</span>
      {(delta || hint) && (
        <div className="flex items-center gap-2 text-sm">
          {delta}
          {hint && <span className="text-slate-400">{hint}</span>}
        </div>
      )}
    </Card>
  )
}
