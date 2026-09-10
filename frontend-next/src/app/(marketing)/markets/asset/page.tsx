import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AssetDetailView } from '@/components/markets/AssetDetailView'

export const metadata: Metadata = {
  title: 'Asset Details',
  description: 'Live price, 24-hour performance, and market data for this digital asset, with buy and sell trading.',
  robots: { index: false, follow: true },
}

export default function AssetDetailPage() {
  return (
    <Suspense>
      <AssetDetailView />
    </Suspense>
  )
}
