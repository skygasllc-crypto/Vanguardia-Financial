import Image from 'next/image'
import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  dark?: boolean
  /** Render the "Vanguardia Financial" wordmark beside the mark.
   *
   * Off inside the signed-in app chrome, where the sidebar is only 16rem wide
   * and the wordmark crowds the slot. The image keeps its full alt text either
   * way, so the brand name still reaches screen readers when it is not drawn. */
  wordmark?: boolean
}

export function Logo({ className, dark = false, wordmark = true }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide sm:gap-3 sm:text-lg',
        dark ? 'text-white' : 'text-navy-900',
        className,
      )}
    >
      <Image src="/logo.png" alt="Vanguardia Financial" width={40} height={40} className="h-8 w-auto sm:h-10" priority />
      {wordmark && <span className="whitespace-nowrap">Vanguardia Financial</span>}
    </span>
  )
}
