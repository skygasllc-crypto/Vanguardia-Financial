'use client'

import { useToastStore } from '@/store/toastStore'
import { cn } from '@/lib/cn'

const toneClasses = {
  success: 'bg-navy-900 text-white',
  error: 'bg-loss-500 text-white',
  info: 'bg-white text-navy-900 border border-slate-200',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn('flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-[var(--shadow-card-lg)]', toneClasses[t.tone])}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
