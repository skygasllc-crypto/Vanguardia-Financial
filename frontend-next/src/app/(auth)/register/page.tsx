import type { Metadata } from 'next'

import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Vanguardia Financial account.',
  alternates: { canonical: '/register' },
  robots: { index: true, follow: false },
}

export default function RegisterPage() {
  return <RegisterForm />
}
