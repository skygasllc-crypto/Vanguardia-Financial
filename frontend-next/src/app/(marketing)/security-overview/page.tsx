import type { Metadata } from 'next'
import Link from 'next/link'

import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Security Architecture',
  description:
    'How Vanguardia Financial protects accounts: bcrypt password hashing, short-lived JWTs, session and device control, an immutable transaction ledger, and full audit logging.',
  alternates: { canonical: '/security-overview' },
}

const PILLARS = [
  {
    title: 'Authentication',
    summary: 'Every credential and session is designed so that a leaked database or an intercepted request still can’t hand over your account.',
    points: [
      'Passwords hashed with bcrypt — never stored or logged in plain text',
      'Short-lived JWT access tokens (15 min) limit the damage window of a stolen token',
      'Rotating refresh tokens, individually revocable, replace long-lived sessions',
      'Two-factor authentication (TOTP) architecture for a second, device-bound factor',
    ],
  },
  {
    title: 'Session & Device Control',
    summary: 'You can see, at any time, everywhere your account is signed in — and end any session you don’t recognize instantly.',
    points: [
      'Per-device session tracking, separate from any other device you use',
      'Revoke any session remotely from Security settings, no support ticket needed',
      'Full login history with timestamp, IP address, and user agent',
      'Suspicious login detection architecture flags unusual access patterns',
    ],
  },
  {
    title: 'Data & Accounting Integrity',
    summary: 'Your balance is never a field someone typed a new number into — it is always the output of a verifiable transaction history.',
    points: [
      'Immutable, append-only transaction ledger backs every balance shown',
      'No direct balance edits, ever — even administrators can only add ledger entries',
      'Full audit log of every administrative action, tied to the acting admin',
      'Role-based access control gates every admin-only function',
    ],
  },
  {
    title: 'Platform Hardening',
    summary: 'The infrastructure around your account is hardened the same way a production financial system would be.',
    points: [
      'Rate limiting on authentication and other sensitive endpoints',
      'Strict CORS configuration limiting which origins can call the API',
      'Secure HTTP security headers on every response',
      'Environment-based secrets management — nothing sensitive hardcoded in source',
    ],
  },
]

export default function SecurityOverviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-navy-900">Security architecture</h1>
        <p className="mt-3 text-slate-500">
          Vanguardia Financial is built the way a financial platform should be, even in its MVP form. Account security
          isn&apos;t a feature we bolted on afterward — it&apos;s the same foundation a production trading system would need before
          handling a single real dollar.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <h2 className="text-base font-semibold text-navy-900">{p.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.summary}</p>
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {p.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-10 bg-navy-950 text-white">
        <h2 className="text-base font-semibold text-white">Our commitment to transparency</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          This platform combines real market data with a fully managed trading ledger, holding ourselves to a strict
          transparency standard: any value not independently derived from a live market feed — including
          administrator-configured data — is clearly identified as such in the product itself. See our{' '}
          <Link href="/risk-disclosure" className="font-semibold text-white underline underline-offset-2">
            Risk Disclosure
          </Link>{' '}
          for the full picture.
        </p>
      </Card>
    </div>
  )
}
