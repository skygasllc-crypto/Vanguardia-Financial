import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'gain' | 'loss' | 'accent' | 'gold' | 'warning'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  gain: 'bg-gain-50 text-gain-600',
  loss: 'bg-loss-50 text-loss-600',
  accent: 'bg-accent-50 text-accent-700',
  gold: 'bg-amber-50 text-gold-500',
  warning: 'bg-amber-50 text-amber-700',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', toneClasses[tone], className)}>
      {children}
    </span>
  )
}
