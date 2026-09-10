import type { Metadata } from 'next'

import { InvestmentProductPage } from '@/components/public/InvestmentProductPage'

export const metadata: Metadata = {
  title: 'Stocks',
  description: 'Planned individual-stock trading on Vanguardia Financial — how it works and when it is coming.',
  alternates: { canonical: '/investments/stocks' },
}

export default function StocksPage() {
  return (
    <InvestmentProductPage
      eyebrow="Investment Products"
      title="Stocks"
      tagline="A market for individual company shares — stock-picking and position sizing the same way you trade crypto here."
      image="/trust-secure.jpg"
      whatItIs={[
        'A stock represents fractional ownership of a single company. Its price moves on the market’s changing view of that company’s future earnings, competitive position, and risk — which is why individual stocks tend to be more volatile than a diversified basket.',
        'Trading individual stocks means concentrated exposure: your result depends heavily on how one company performs, for better or worse. It’s a useful complement to diversified products like ETFs and mutual funds, not a replacement for them.',
      ]}
      howItWillWork={[
        'A set of original example companies across sectors (technology, industrials, healthcare, energy, consumer) — not real, tradable securities.',
        'The same market/limit/stop-limit order types and trading engine already powering crypto trading here.',
        'Price movement calibrated to be calmer than crypto but still realistic for an individual equity.',
        'Positions, P&L, and transaction history integrated into the same portfolio and ledger you already use.',
      ]}
    />
  )
}
