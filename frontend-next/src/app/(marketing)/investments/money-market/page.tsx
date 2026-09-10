import type { Metadata } from 'next'

import { InvestmentProductPage } from '@/components/public/InvestmentProductPage'

export const metadata: Metadata = {
  title: 'Money Market Funds',
  description: 'Planned money market fund investing on Vanguardia Financial — how it works and when it is coming.',
  alternates: { canonical: '/investments/money-market' },
}

export default function MoneyMarketPage() {
  return (
    <InvestmentProductPage
      eyebrow="Investment Products"
      title="Money Market Funds"
      tagline="A cash-equivalent product that accrues a steady yield instead of moving with the market — a place to park uninvested balances."
      image="/hero-skyline.jpg"
      whatItIs={[
        'A money market fund invests in very short-term, low-risk instruments and aims to hold a stable value — typically around $1.00 per share — while paying out a yield. It isn’t designed to grow in price; it’s designed to be a stable, interest-bearing place to hold cash you aren’t actively investing.',
        'Practicing with a money market fund teaches a different skill than trading: understanding yield, opportunity cost, and why "doing nothing" with a portion of a portfolio is sometimes the right call.',
      ]}
      howItWillWork={[
        'A set of original example funds, each with a stated annual percentage yield (APY).',
        'Price accrues smoothly toward that yield over time — deterministic interest, not random market movement.',
        'No trading skill required: this is about understanding cash management, not timing a market.',
        'Balances integrated into your existing portfolio and transaction ledger.',
      ]}
    />
  )
}
