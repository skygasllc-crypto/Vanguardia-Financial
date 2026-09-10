import type { Metadata } from 'next'

import { InvestmentProductPage } from '@/components/public/InvestmentProductPage'

export const metadata: Metadata = {
  title: 'ETFs',
  description: 'Planned exchange-traded fund (ETF) trading on Vanguardia Financial — how it works and when it is coming.',
  alternates: { canonical: '/investments/etfs' },
}

export default function EtfsPage() {
  return (
    <InvestmentProductPage
      eyebrow="Investment Products"
      title="ETFs"
      tagline="A market for exchange-traded funds — instant diversification across a themed basket of assets, traded like a single stock."
      image="/trust-markets.jpg"
      whatItIs={[
        'An ETF (exchange-traded fund) holds a basket of underlying assets — an index, a sector, a strategy — and trades on an exchange throughout the day like a single stock. Buying one share gives you exposure to everything inside the basket at once.',
        'Because the risk is spread across many holdings, an individual company’s bad quarter has far less impact on an ETF than it would on that company’s stock alone. ETFs are one of the most common building blocks for a diversified portfolio.',
      ]}
      howItWillWork={[
        'A set of original example funds — a broad market index, a global technology basket, a bond fund, and others — not real, tradable securities.',
        'Continuous intraday pricing, deliberately calmer than individual stocks to reflect real diversification.',
        'The same market/limit/stop-limit order types already available for crypto.',
        'Full integration with your existing portfolio view, watchlist, and transaction ledger.',
      ]}
    />
  )
}
