import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your Vanguardia Financial account to access your portfolio and trading terminal.',
  alternates: { canonical: '/login' },
  robots: { index: true, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
