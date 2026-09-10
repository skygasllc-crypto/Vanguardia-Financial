import Image from 'next/image'
import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  /** Tints the wordmark for dark backgrounds. The mark itself is unchanged. */
  dark?: boolean
  /** How large to draw the mark.
   *
   * A size prop rather than a className override, because `cn` is plain clsx
   * with no Tailwind merging — passing `h-10` alongside the internal height
   * would emit both classes and let source order decide. */
  size?: 'sm' | 'md' | 'lg'
  /** Render the "Vanguardia Financial" wordmark beside the mark.
   *
   * Off by default: logo.png already carries the brand, so repeating it as
   * text doubled the width and crowded every slot it sat in. The image keeps
   * its full alt text either way, so the name still reaches screen readers. */
  wordmark?: boolean
}

/** Intrinsic size of public/logo.png, 1031×431. Passed through at a scale
 * Next can use for layout: giving it a square 40×40 told the optimiser the
 * wrong aspect ratio for a mark that is nearly two and a half times as wide
 * as it is tall. Rendered height comes from the class, width follows. */
const LOGO_WIDTH = 1031
const LOGO_HEIGHT = 431

/** `sm` is sized to sit inside the 64px app and admin sidebar headers without
 * crowding them; `lg` is for the auth split-panel, which has room to spare. */
const SIZES = {
  sm: 'h-9 w-auto sm:h-10',
  md: 'h-11 w-auto sm:h-14',
  lg: 'h-14 w-auto sm:h-20',
} as const

export function Logo({ className, dark = false, wordmark = false, size = 'md' }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide sm:gap-3 sm:text-lg',
        dark ? 'text-white' : 'text-navy-900',
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="Vanguardia Financial"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={SIZES[size]}
        priority
      />
      {wordmark && <span className="whitespace-nowrap">Vanguardia Financial</span>}
    </span>
  )
}
