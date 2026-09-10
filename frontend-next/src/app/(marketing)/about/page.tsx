import type { Metadata } from 'next'
import Image from 'next/image'

import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Who We Are',
  description:
    'Learn about Vanguardia Financial — a global financial services firm delivering investment management, wealth advisory, and institutional-grade trading solutions across multiple asset classes.',
  alternates: { canonical: '/about' },
}

const COMPANY = {
  legalName: 'Vanguardia Financial',
  founded: '1972',
  founder: 'Douglas Brandon',
  chairman: 'William Petersen',
  ceo: 'Michael Keen',
  headquarters: '1350 6th Avenue, New York, NY 10019',
  phone1: '+1-934-202-5711',
  phone2: '+1-208-974-2356',
  email: 'contact@vanguardiafinancial.com',
  website: 'vanguardiafinancial.com',
  employees: '20,000+',
  globalPresence: '40+ countries',
  aum: '$13.9 trillion',
}

const TIMELINE = [
  {
    year: '1972',
    title: 'Foundation',
    description: 'Douglas Brandon establishes Vanguardia Financial in New York City with a vision to democratize institutional-grade investment tools for retail investors.',
  },
  {
    year: '1985',
    title: 'International Expansion',
    description: 'Opened offices in London and Tokyo, establishing our presence as a global financial services provider.',
  },
  {
    year: '1998',
    title: 'Digital Trading Platform Launch',
    description: 'Pioneered one of the first web-based trading platforms, bringing professional trading capabilities directly to individual investors.',
  },
  {
    year: '2010',
    title: 'Wealth Management Division',
    description: 'Launched comprehensive wealth advisory services, managing over $1 trillion in client assets within the first five years.',
  },
  {
    year: '2018',
    title: 'Digital Assets Integration',
    description: 'Became one of the first traditional financial institutions to offer regulated cryptocurrency trading and custody services.',
  },
  {
    year: '2024',
    title: 'Next-Generation Platform',
    description: 'Deployed unified digital platform integrating equities, fixed income, ETFs, mutual funds, and digital assets under a single professional trading environment.',
  },
]

const BUSINESS_SEGMENTS = [
  {
    title: 'Investment Management',
    description: 'Comprehensive portfolio management services for institutional and individual clients, offering actively managed funds, index funds, and customized separate accounts across all major asset classes.',
    assets: '$8.2T AUM',
  },
  {
    title: 'Wealth Advisory',
    description: 'Personalized financial planning, estate planning, and investment advisory services for high-net-worth individuals and families, backed by dedicated relationship managers.',
    assets: '$3.1T AUM',
  },
  {
    title: 'Digital Asset Services',
    description: 'Institutional-grade cryptocurrency trading, custody, and investment products, including spot trading, futures, options, and digital asset funds.',
    assets: '$2.6T AUM',
  },
  {
    title: 'Brokerage & Trading',
    description: 'Full-service and self-directed brokerage accounts with access to global equity markets, fixed income, options, futures, and forex trading with competitive pricing.',
    assets: '12M+ accounts',
  },
  {
    title: 'Retirement Services',
    description: '401(k) plan administration, IRA accounts, pension fund management, and rollover services with comprehensive retirement planning tools and education.',
    assets: '45K+ plans',
  },
  {
    title: 'Institutional Solutions',
    description: 'Prime brokerage, execution services, securities lending, and risk management solutions for hedge funds, asset managers, and corporate treasury departments.',
    assets: '2,800+ clients',
  },
]

const VALUES = [
  {
    title: 'Client First',
    body: 'Every decision is guided by what serves our clients best. We operate under a fiduciary standard, putting client interests ahead of our own in every recommendation and transaction.',
  },
  {
    title: 'Transparency & Integrity',
    body: 'Clear pricing, comprehensive disclosures, and honest communication form the foundation of every client relationship. No hidden fees, no conflicts of interest, no surprises.',
  },
  {
    title: 'Innovation & Excellence',
    body: 'Continuous investment in technology, research, and talent development ensures our clients benefit from cutting-edge tools, insights, and strategies in an evolving financial landscape.',
  },
  {
    title: 'Long-Term Focus',
    body: 'We build relationships measured in decades, not quarters. Our investment philosophy prioritizes sustainable growth and wealth preservation over short-term speculation.',
  },
  {
    title: 'Global Reach, Local Expertise',
    body: 'A presence in 40+ countries combined with deep local market knowledge allows us to identify opportunities and manage risks across global markets.',
  },
  {
    title: 'Security & Compliance',
    body: 'Enterprise-grade cybersecurity, comprehensive regulatory compliance, and SIPC/FDIC protection provide multiple layers of security for client assets and data.',
  },
]

export default function AboutPage() {
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
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-400">Who We Are</span>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
            Vanguardia Financial
          </h1>
          <div className="mt-2 h-1 w-24 bg-accent-600"></div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200 sm:mt-6 sm:text-lg">
            A global financial services firm trusted by millions of investors, managing $13.9 trillion in assets across equities, fixed income, alternative investments, and digital assets.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="border-l-4 border-accent-600 pl-6">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-900">$13.9T</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-600">Assets Under Management</p>
            </div>
            <div className="border-l-4 border-accent-600 pl-6">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-900">50M+</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-600">Global Investors Served</p>
            </div>
            <div className="border-l-4 border-accent-600 pl-6">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-900">20,000</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-600">Worldwide Employees</p>
            </div>
            <div className="border-l-4 border-accent-600 pl-6">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-900">487</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-slate-600">Funds Managed Globally</p>
            </div>
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">Our History</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
              Since 1972, Vanguardia Financial has evolved from a pioneering brokerage firm into one of the world's largest diversified financial services companies, guided by an unwavering commitment to client success and market-leading innovation.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-accent-600/20 lg:left-1/2"></div>
            <div className="space-y-12">
              {TIMELINE.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-12 ${
                    index % 2 === 0 ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={`${index % 2 === 0 ? 'lg:text-right' : 'lg:col-start-2'}`}>
                    <span className="inline-block font-display text-3xl font-bold text-accent-600">{item.year}</span>
                    <h3 className="mt-2 text-xl font-semibold text-navy-900">{item.title}</h3>
                  </div>
                  <div className={`${index % 2 === 0 ? '' : 'lg:col-start-2'}`}>
                    <Card>
                      <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                    </Card>
                  </div>
                  <div className="absolute left-4 top-8 h-3 w-3 rounded-full bg-accent-600 lg:left-1/2 lg:-translate-x-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Business Segments */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-navy-900">What We Do</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_SEGMENTS.map((segment) => (
              <Card key={segment.title} className="flex flex-col">
                <h3 className="text-lg font-semibold text-navy-900">{segment.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{segment.description}</p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-accent-600">{segment.assets}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-navy-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mb-16">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white">Our Values</h2>
            <div className="mt-2 h-1 w-20 bg-accent-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.title}>
                <h3 className="text-lg font-semibold text-white">{value.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-12">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Corporate Information</h2>
            <dl className="mt-6 grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
              <Row label="Legal Name" value={COMPANY.legalName} />
              <Row label="Founded" value={COMPANY.founded} />
              <Row label="Founder" value={COMPANY.founder} />
              <Row label="Chairman" value={COMPANY.chairman} />
              <Row label="Chief Executive Officer" value={COMPANY.ceo} />
              <Row label="Employees" value={COMPANY.employees} />
              <Row label="Global Presence" value={COMPANY.globalPresence} />
              <Row label="Assets Under Management" value={COMPANY.aum} />
            </dl>

            <div className="mt-8 border-t border-slate-100 pt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
              <dl className="mt-6 grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
                <Row label="Headquarters" value={COMPANY.headquarters} />
                <Row label=" Connect to Advisor" value={`${COMPANY.phone1}`} />
                <Row label="Contact Support" value={`${COMPANY.phone2}`} />
                <Row label="Email" value={COMPANY.email} />
                <Row label="Website" value={COMPANY.website} />
              </dl>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-navy-900">{value}</dd>
    </div>
  )
}
