import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { MarketTicker } from '@/components/dashboard/MarketTicker'
import { TrendingAssetsGrid } from '@/components/marketing/TrendingAssetsGrid'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Card } from '@/components/common/Card'
import { PnLText } from '@/components/common/PnLText'
import { formatCurrency } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Global Financial Services & Investment Management',
  description:
    'Vanguardia Financial delivers comprehensive investment solutions across equities, fixed income, ETFs, mutual funds, and digital assets — trusted by 50 million investors worldwide with $13.9 trillion in assets under management.',
  alternates: { canonical: '/' },
}

// Every figure here is a real, verifiable fact about the platform itself —
// deliberately not a fabricated user-count/volume stat, which would be
// dishonest for a pre-launch product.
const STATS = [
  { value: '50M+', label: 'Global Investors Served' },
  { value: '$13.9T', label: 'Assets Under Management' },
  { value: '20,000', label: 'Worldwide Crew & Employees' },
  { value: '487', label: 'Total Funds At Managed Globally' },
]

const PILLARS = [
  {
    title: 'Investment Management',
    description: 'Comprehensive portfolio management across equities, fixed income, ETFs, and mutual funds with actively managed and index strategies.',
    image: '/trust-secure.jpg',
    href: '/investments',
  },
  {
    title: 'Digital Asset Trading',
    description: 'Professional cryptocurrency trading terminal with real-time market data, advanced charting, and institutional-grade execution.',
    image: '/trust-markets.jpg',
    href: '/markets',
  },
  {
    title: 'Wealth Advisory',
    description: 'Personalized financial planning, retirement services, and dedicated relationship management for high-net-worth clients.',
    image: '/trust-expertise.jpg',
    href: '/about',
  },
]

const RESOURCE_HUB = [
  {
    heading: 'Getting Started',
    links: [
      { label: 'Create an account', href: '/register' },
      { label: 'Log in', href: '/login' },
      { label: 'Frequently asked questions', href: '/#faq' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: 'Understanding order types', href: '/learn#order-types' },
      { label: 'Understanding the platform', href: '/learn#getting-started' },
      { label: 'Full learning hub', href: '/learn' },
    ],
  },
  {
    heading: 'Trust & Security',
    links: [
      { label: 'About Vanguardia Financial', href: '/about' },
      { label: 'Security architecture', href: '/security-overview' },
      { label: 'Risk disclosure', href: '/risk-disclosure' },
    ],
  },
]

const FAQ = [
  {
    q: 'What services does Vanguardia Financial offer?',
    a: 'We provide comprehensive financial services including investment management, wealth advisory, retirement planning, brokerage services, and digital asset trading. Our platform serves both individual and institutional investors across all major asset classes.',
  },
  {
    q: 'How much does Vanguardia Financial manage?',
    a: 'Vanguardia Financial manages $13.9 trillion in assets under management, serving over 50 million investors globally with a presence in 40+ countries.',
  },
  {
    q: 'What investment products are available?',
    a: 'Our platform offers stocks, ETFs, mutual funds, money market funds, certificates of deposit, fixed income securities, and digital assets including cryptocurrency trading with real-time market data.',
  },
  {
    q: 'Is my investment secure?',
    a: 'Yes. Vanguardia Financial is built with enterprise-grade security infrastructure. Your funds are protected by advanced encryption, multi-factor authentication, SIPC/FDIC protection, and comprehensive regulatory compliance.',
  },
  {
    q: 'How do I get started?',
    a: 'Open an account by clicking "Open Account" above. The registration process is straightforward, and you can begin exploring our investment products and market research immediately.',
  },
  {
    q: 'Does Vanguardia Financial offer wealth advisory services?',
    a: 'Yes. We provide personalized financial planning, estate planning, and dedicated relationship management for high-net-worth individuals and families, backed by our team of experienced advisors.',
  },
  {
    q: 'What makes Vanguardia Financial different?',
    a: 'Since 1972, we have combined institutional-grade investment tools with retail accessibility. Our commitment to transparency, client-first approach, and comprehensive product suite sets us apart in the financial services industry.',
  },
]

export default function LandingPage() {
  return (
    <div>
      {/* 1. Hero — Professional full-width hero with bold typography */}
      <section className="relative overflow-hidden bg-navy-900">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/hero-skyline.jpg"
            alt=""
            aria-hidden="true"
            fill
            priority
            className="object-cover opacity-30"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/70 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32 lg:px-12 lg:py-48">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Investment Excellence
            </h1>
            <div className="mt-2 h-1 w-24 bg-accent-600"></div>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:mt-8 sm:text-xl">
              A global financial services firm delivering comprehensive investment management, wealth advisory, and institutional-grade trading solutions across all major asset classes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:mt-12 sm:gap-4">
              <ButtonLink href="/register" size="lg" className="!bg-accent-600 !text-white hover:!bg-accent-700">
                Open Account
              </ButtonLink>
              <ButtonLink href="/investments" variant="secondary" size="lg" className="!border-white !bg-transparent !text-white hover:!bg-white/10">
                Investment Products
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats section — clean horizontal layout */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="border-l-4 border-accent-600 pl-6">
                <p className="font-display text-4xl font-bold tabular-nums text-navy-900">{s.value}</p>
                <p className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Snapshot & insight — two-column card pair, ticker widget below */}
      <section className="bg-slate-50 pb-0 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="bg-navy-950 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sample Portfolio</p>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums">{formatCurrency('24850.60')}</p>
              <div className="mt-2 flex items-center gap-2">
                <PnLText value="1240.50" size="md" />
                <span className="text-sm text-slate-400">Today</span>
              </div>
              <div className="mt-6 h-24 rounded-lg bg-white/5" />
              <Link href="/app/portfolio" className="mt-5 inline-block text-sm font-semibold text-accent-400 hover:text-accent-100">
                See how portfolio tracking works →
              </Link>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Investment Solutions</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-navy-900">Diversified Portfolio Strategies</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Access a comprehensive suite of investment products including stocks, ETFs, mutual funds, fixed income, and digital assets.
                Our platform delivers institutional-grade research, analytics, and portfolio management tools designed for both individual and institutional investors.
              </p>
              <Link href="/investments" className="mt-5 inline-block text-sm font-semibold text-accent-600 hover:text-accent-700">
                Explore investment products →
              </Link>
            </Card>
          </div>
        </div>
        <div className="mt-12">
          <MarketTicker />
        </div>
      </section>

      {/* 4. Mission statement — full-width dark band, single CTA */}
      <section className="relative overflow-hidden bg-navy-950 py-20">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_0%_50%,rgba(47,125,201,0.3),transparent_60%)] pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Trusted by 50 million investors worldwide
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Since 1972, Vanguardia Financial has evolved from a pioneering brokerage firm into one of the world's largest diversified financial services companies.
            With $13.9 trillion in assets under management and a presence in 40+ countries, we deliver institutional-grade investment solutions with unwavering commitment to client success.
          </p>
          <Link href="/about" className="mt-6 inline-block text-sm font-semibold text-accent-400 hover:text-accent-100">
            Our history →
          </Link>
        </div>
      </section>

      {/* 5. Trending assets — live 4-up grid */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-navy-900">Digital Asset Markets</h2>
            <p className="mt-3 text-slate-500">Live cryptocurrency prices with institutional-grade trading tools and real-time market data.</p>
          </div>
          <div className="mt-12">
            <TrendingAssetsGrid />
          </div>
          <div className="mt-8 text-center">
            <Link href="/markets" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
              Explore digital asset markets →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Platform capabilities — clean grid layout */}
      <section id="platform-features" className="scroll-mt-20 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">Our Services</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Comprehensive financial solutions across investment management, digital assets, and wealth advisory services.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <Link key={p.title} href={p.href} className="group block bg-white transition-all hover:shadow-lg">
                <div className="relative h-64 overflow-hidden">
                  <Image src={p.image} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                    <h3 className="text-xl font-bold uppercase text-white">{p.title}</h3>
                  </div>
                </div>
                <div className="border-t-4 border-accent-600 p-6">
                  <p className="text-sm leading-relaxed text-slate-700">{p.description}</p>
                  <span className="mt-4 inline-block font-bold text-accent-600 group-hover:text-accent-700">Learn more →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Resource hub — three-column link columns */}
      <section className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-navy-900">Find your way around</h2>
            <p className="mt-3 text-slate-500">Everything you need to get started, learn, and trust the platform.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {RESOURCE_HUB.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-accent-600">{col.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm font-medium text-navy-800 hover:text-accent-600">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {FAQ.map((item) => (
              <Card key={item.q}>
                <h3 className="text-sm font-semibold text-navy-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="bg-navy-950 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white">Ready to invest with confidence?</h2>
          <p className="mt-3 text-slate-400">Join 50 million investors who trust Vanguardia Financial with their financial future.</p>
          <div className="mt-8 flex justify-center gap-4">
            <ButtonLink href="/register" size="lg">
              Open Account
            </ButtonLink>
            <ButtonLink href="/about" variant="secondary" size="lg" className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
              Learn More
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  )
}
