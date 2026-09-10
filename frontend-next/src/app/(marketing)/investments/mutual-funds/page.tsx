import type { Metadata } from 'next'

import { InvestmentProductPage } from '@/components/public/InvestmentProductPage'

export const metadata: Metadata = {
  title: 'Mutual Funds',
  description: 'Planned mutual fund investing on Vanguardia Financial — how it works and when it is coming.',
  alternates: { canonical: '/investments/mutual-funds' },
}

export default function MutualFundsPage() {
  return (
    <InvestmentProductPage
      eyebrow="Investment Products"
      title="Mutual Funds"
      tagline="A market for actively-managed fund strategies — priced once per day, the same way mutual funds work."
      image="/trust-expertise.jpg"
      whatItIs={[
        'A mutual fund pools money into a professionally managed portfolio built around a specific strategy — growth, value, income, international, and so on. Unlike an ETF, a mutual fund is priced only once per day, after the market closes, based on the net value of everything it holds.',
        'That daily-pricing rhythm makes mutual funds a useful lesson in patience: you can’t react to every intraday swing, which is itself part of the discipline many long-term investors practice.',
      ]}
      howItWillWork={[
        'A set of original example fund strategies — growth equity, balanced income, value, international, and conservative allocation — not real, tradable securities.',
        'Daily net-asset-value pricing rather than continuous intraday movement, matching how mutual funds settle.',
        'The same order placement and portfolio tracking already used for crypto, adapted to a once-daily fill.',
        'Transaction history and realized/unrealized P&L integrated into your existing ledger.',
      ]}
    />
  )
}
