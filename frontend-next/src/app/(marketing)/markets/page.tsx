import type { Metadata } from 'next'

import { MarketsView } from '@/components/markets/MarketsView'

export const metadata: Metadata = {
  title: 'Crypto Markets — Live Prices',
  description:
    'Browse live cryptocurrency prices, 24-hour change, market cap, and volume. Track trending assets, top gainers and losers, and new listings.',
  alternates: { canonical: '/markets' },
}

export default function MarketsPage() {
  return <MarketsView />
}
