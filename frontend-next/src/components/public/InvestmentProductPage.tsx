import Image from 'next/image'

import { Badge } from '@/components/common/Badge'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Card } from '@/components/common/Card'

interface InvestmentProductPageProps {
  eyebrow: string
  title: string
  tagline: string
  image: string
  whatItIs: string[]
  howItWillWork: string[]
}

/** Shared layout for the five individual investment-product pages
 * (Stocks/ETFs/Mutual Funds/Money Market/CDs) plus the overview page —
 * each gets its own route, a full-width image banner, and dedicated copy.
 * These are informational-only — the platform is crypto-only today, so
 * every page here is explicitly labeled "Coming Soon" rather than linking
 * to trading functionality that doesn't exist. */
export function InvestmentProductPage({ eyebrow, title, tagline, image, whatItIs, howItWillWork }: InvestmentProductPageProps) {
  return (
    <div>
      <section className="relative h-72 overflow-hidden bg-navy-950 sm:h-80">
        <Image src={image} alt="" aria-hidden="true" fill priority className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/80 to-navy-950/50" />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col justify-end px-4 pb-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-400">{eyebrow}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{tagline}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What it is</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
            {whatItIs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Card>

        <Card className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">How this works on Vanguardia Financial</h2>
          <ul className="mt-3 space-y-2.5">
            {howItWillWork.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                {point}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="mt-6 bg-navy-950 text-white">
          <h2 className="text-base font-semibold text-white">Ready to start investing?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Access professional-grade trading tools, real-time market data, comprehensive analytics, and secure portfolio management across all investment categories.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/markets" variant="secondary" className="!border-white/15 !bg-white/5 !text-white hover:!bg-white/10">
              Browse Markets
            </ButtonLink>
            <ButtonLink href="/register">Create Free Account</ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  )
}
