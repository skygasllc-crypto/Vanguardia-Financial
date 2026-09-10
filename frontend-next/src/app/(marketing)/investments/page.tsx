import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { Card } from '@/components/common/Card'
import { ButtonLink } from '@/components/common/ButtonLink'

export const metadata: Metadata = {
  title: 'Investment Products & Solutions',
  description:
    'Comprehensive investment solutions across equities, fixed income, ETFs, mutual funds, and digital assets. Vanguardia Financial delivers institutional-grade portfolio management and wealth advisory services for individual and institutional investors.',
  alternates: { canonical: '/investments' },
}

const KEY_TAKEAWAYS = [
  {
    title: '$13.9 Trillion',
    description: 'Assets under management across all investment categories',
  },
  {
    title: '487 Funds',
    description: 'Actively managed and index fund strategies globally',
  },
  {
    title: '50M+ Investors',
    description: 'Individual and institutional clients served worldwide',
  },
  {
    title: '40+ Countries',
    description: 'Global presence with deep local market expertise',
  },
]

const INVESTMENT_CATEGORIES = [
  {
    category: 'Equity Investments',
    products: [
      {
        name: 'Individual Stocks',
        description: 'Direct ownership in publicly traded companies across global exchanges with real-time execution and advanced research tools.',
        features: ['Real-time market data', 'Advanced charting tools', 'Company fundamentals', 'Analyst ratings'],
        href: '/investments/stocks',
      },
      {
        name: 'Exchange-Traded Funds (ETFs)',
        description: 'Diversified index and sector-focused ETFs offering broad market exposure with the flexibility of stock trading.',
        features: ['Low expense ratios', 'Intraday trading', 'Tax efficiency', 'Sector diversification'],
        href: '/investments/etfs',
      },
    ],
  },
  {
    category: 'Managed Funds',
    products: [
      {
        name: 'Mutual Funds',
        description: 'Professionally managed portfolios across asset classes and investment styles, from growth to value to balanced strategies.',
        features: ['Professional management', 'Daily liquidity', 'Automatic reinvestment', 'Performance transparency'],
        href: '/investments/mutual-funds',
      },
      {
        name: 'Money Market Funds',
        description: 'Conservative, cash-equivalent investments providing capital preservation with competitive yields and same-day liquidity.',
        features: ['Capital preservation', 'Daily liquidity', 'Competitive yields', 'Low volatility'],
        href: '/investments/money-market',
      },
    ],
  },
  {
    category: 'Fixed Income',
    products: [
      {
        name: 'Certificates of Deposit',
        description: 'FDIC-insured fixed-rate deposits across various maturities, offering predictable returns and principal protection.',
        features: ['FDIC insurance', 'Fixed interest rates', 'Multiple maturities', 'Predictable returns'],
        href: '/investments/cds',
      },
      {
        name: 'Bond Portfolios',
        description: 'Diversified fixed income strategies including government, municipal, corporate, and international bonds.',
        features: ['Income generation', 'Portfolio diversification', 'Credit quality options', 'Maturity laddering'],
        href: '/investments/bonds',
      },
    ],
  },
  {
    category: 'Digital Assets',
    products: [
      {
        name: 'Cryptocurrency Trading',
        description: 'Institutional-grade digital asset trading with real-time market data, advanced order types, and secure custody solutions.',
        features: ['Real-time pricing', 'Professional trading terminal', 'Secure custody', 'Market depth'],
        href: '/markets',
      },
      {
        name: 'Digital Asset Funds',
        description: 'Managed cryptocurrency portfolios providing diversified exposure to digital assets without direct ownership complexity.',
        features: ['Professional management', 'Diversified exposure', 'Regulatory compliance', 'Simplified custody'],
        href: '/investments/digital-asset-funds',
      },
    ],
  },
]

const INVESTMENT_APPROACHES = [
  {
    title: 'Active Management',
    description: 'Portfolio managers actively select securities based on research, analysis, and market outlook to outperform benchmarks.',
    benefits: ['Professional expertise', 'Market timing flexibility', 'Risk management', 'Tactical opportunities'],
  },
  {
    title: 'Index Strategies',
    description: 'Passively managed portfolios designed to track market indices, offering broad diversification at lower costs.',
    benefits: ['Low expense ratios', 'Broad market exposure', 'Tax efficiency', 'Transparency'],
  },
  {
    title: 'Factor-Based Investing',
    description: 'Systematic strategies targeting specific return drivers such as value, momentum, quality, and low volatility.',
    benefits: ['Evidence-based approach', 'Diversified factors', 'Rules-based discipline', 'Risk-adjusted returns'],
  },
]

const ADVISORY_SERVICES = [
  {
    title: 'Wealth Management',
    service: 'Personalized portfolio construction and ongoing management',
    ideal: 'High-net-worth individuals and families',
  },
  {
    title: 'Retirement Planning',
    service: '401(k), IRA, pension management, and rollover services',
    ideal: 'Individual retirement savers and plan sponsors',
  },
  {
    title: 'Institutional Solutions',
    service: 'Custom portfolio management for endowments, foundations, and corporate treasuries',
    ideal: 'Institutional investors and fiduciaries',
  },
]

const COMMITMENT_PILLARS = [
  {
    title: 'Fiduciary Standard',
    body: 'Every recommendation and investment decision is made with your best interests as the primary consideration, adhering to the highest fiduciary standards.',
  },
  {
    title: 'Transparent Pricing',
    body: 'Clear, upfront disclosure of all fees, expenses, and costs. No hidden charges, no surprises—complete transparency in every transaction.',
  },
  {
    title: 'Research & Insights',
    body: 'Institutional-quality research, market analysis, and portfolio insights powered by our global team of economists, strategists, and analysts.',
  },
  {
    title: 'Risk Management',
    body: 'Comprehensive risk assessment, monitoring, and management processes designed to protect capital while pursuing investment objectives.',
  },
]

export default function InvestmentsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden bg-navy-950">
        <Image
          src="/hero-skyline.jpg"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/95 to-navy-950/70" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 sm:pb-16 lg:px-12">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-400">Investment Solutions</span>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
            Investment Products
          </h1>
          <div className="mt-2 h-1 w-24 bg-accent-600"></div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200 sm:mt-6 sm:text-lg">
            Comprehensive investment solutions across equities, fixed income, managed funds, and digital assets—designed to help individual and institutional investors achieve their financial objectives.
          </p>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="border-b border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key Takeaways</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_TAKEAWAYS.map((item) => (
              <div key={item.title} className="border-l-4 border-accent-600 pl-6">
                <p className="font-display text-3xl font-bold tabular-nums text-navy-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Categories */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">Investment Products</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              A comprehensive suite of investment products spanning all major asset classes, each designed to meet specific investment objectives and risk profiles.
            </p>
          </div>

          <div className="space-y-16">
            {INVESTMENT_CATEGORIES.map((category, idx) => (
              <div key={category.category}>
                <h3 className="mb-6 text-2xl font-bold text-navy-900">{category.category}</h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {category.products.map((product) => (
                    <Card key={product.name} className="flex flex-col">
                      <h4 className="text-lg font-semibold text-navy-900">{product.name}</h4>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{product.description}</p>
                      <div className="mt-4 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Features</p>
                        <ul className="mt-2 space-y-1.5">
                          {product.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Link
                        href={product.href}
                        className="mt-5 inline-block text-sm font-semibold text-accent-600 hover:text-accent-700"
                      >
                        Learn more →
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Approaches */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">Investment Approaches</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Multiple investment strategies designed to align with diverse investment objectives, risk tolerances, and time horizons.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {INVESTMENT_APPROACHES.map((approach) => (
              <div key={approach.title}>
                <h3 className="text-xl font-bold text-navy-900">{approach.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{approach.description}</p>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Benefits</p>
                  <ul className="mt-2 space-y-1.5">
                    {approach.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advisory Services */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">Advisory Services</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Personalized guidance and professional portfolio management from experienced advisors dedicated to your financial success.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ADVISORY_SERVICES.map((advisory) => (
              <Card key={advisory.title}>
                <h3 className="text-lg font-semibold text-navy-900">{advisory.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{advisory.service}</p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ideal For</p>
                  <p className="mt-1 text-sm text-slate-600">{advisory.ideal}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="bg-navy-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white">Our Commitment</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {COMMITMENT_PILLARS.map((pillar) => (
              <div key={pillar.title}>
                <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
          <Card className="bg-slate-50">
            <h2 className="font-display text-3xl font-bold text-navy-900">Ready to start investing?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
              Open an account to access our full suite of investment products, professional research, and dedicated advisory services.
              Our team is ready to help you build a portfolio aligned with your financial goals.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <ButtonLink href="/register" size="lg">
                Open Account
              </ButtonLink>
              <ButtonLink href="/about" variant="secondary" size="lg">
                Learn About Vanguardia Financial
              </ButtonLink>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
