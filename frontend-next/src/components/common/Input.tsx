import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: ReactNode
}

export function Input({ label, error, hint, suffix, className, id, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-900',
            'placeholder:text-slate-400 transition-colors',
            'focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100',
            error && 'border-loss-500 focus:border-loss-500 focus:ring-loss-50',
            suffix && 'pr-16',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {suffix && <div className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-400">{suffix}</div>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-loss-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}
