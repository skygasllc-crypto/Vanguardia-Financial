'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPositionsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to users page - position manipulation is done per user
    router.push('/admin/users')
  }, [router])

  return null
}
