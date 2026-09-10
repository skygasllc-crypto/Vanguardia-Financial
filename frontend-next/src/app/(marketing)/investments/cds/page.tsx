import type { Metadata } from 'next'

import { InvestmentProductPage } from '@/components/public/InvestmentProductPage'

export const metadata: Metadata = {
  title: 'Certificates of Deposit',
  description: 'Planned certificate of deposit (CD) investing on Vanguardia Financial — how it works and when it is coming.',
  alternates: { canonical: '/investments/cds' },
}

export default function CdsPage() {
  return (
    <InvestmentProductPage
      eyebrow="Investment Products"
      title="Certificates of Deposit"
      tagline="A fixed-term, fixed-rate deposit — plan around a locked-in return instead of a moving price."
      image="/trust-markets.jpg"
      whatItIs={[
        'A certificate of deposit (CD) pays a fixed interest rate in exchange for committing funds for a set term — commonly 3 months to 5 years. Longer terms often (though not always) pay a higher rate, since you’re giving up access to the funds for longer.',
        'Unlike a stock or fund, a CD has no price risk at all: the return is locked in from day one. The trade-off is liquidity — withdrawing early from a real CD typically costs a penalty. It’s a useful lesson in how term and rate trade off against each other.',
      ]}
      howItWillWork={[
        'A range of terms — 3-month, 6-month, 1-year, 2-year, and 5-year — each with its own fixed annual rate.',
        'Value accrues deterministically at the stated rate for the term, with no market-style price movement.',
        'Informational by design: this MVP is not expected to lock funds or enforce an early-withdrawal penalty the way a traditional CD would.',
        'Maturity and rate details integrated into your existing portfolio view.',
      ]}
    />
  )
}
