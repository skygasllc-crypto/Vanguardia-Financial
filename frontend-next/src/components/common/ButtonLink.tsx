import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'

import { type ButtonSize, type ButtonVariant, buttonClasses } from '@/components/common/Button'

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, fullWidth, className)} {...rest}>
      {children}
    </Link>
  )
}
