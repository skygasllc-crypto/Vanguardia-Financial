'use client'

import { Suspense } from 'react'

import { AssetDetailView } from '@/components/markets/AssetDetailView'

export default function AppAssetDetailPage() {
  return (
    <Suspense>
      <AssetDetailView />
    </Suspense>
  )
}
