import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'sell' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  isLoading?: boolean
  icon?: ReactNode
}

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 focus-visible:outline-accent-600 font-bold uppercase tracking-wide',
  secondary: 'bg-transparent text-navy-900 border-2 border-navy-900 hover:bg-navy-900 hover:text-white font-bold uppercase tracking-wide',
  ghost: 'bg-transparent text-navy-700 hover:bg-slate-100',
  buy: 'bg-gain-500 text-white hover:bg-gain-600 font-bold',
  sell: 'bg-loss-500 text-white hover:bg-loss-600 font-bold',
  danger: 'bg-loss-50 text-loss-600 border border-loss-500/30 hover:bg-loss-500 hover:text-white',
}

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-4 py-2 rounded-none gap-1.5',
  md: 'text-sm px-6 py-3 rounded-none gap-2',
  lg: 'text-sm px-8 py-4 rounded-none gap-2',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth = false, className?: string): string {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-colors duration-150',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    fullWidth && 'w-full',
    className,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  isLoading,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, fullWidth, className)}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
