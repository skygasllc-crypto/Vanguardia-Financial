import type { Metadata } from 'next'

import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a free Vanguardia Financial account and start with a $100,000 balance.',
  alternates: { canonical: '/register' },
  robots: { index: true, follow: false },
}

export default function RegisterPage() {
  return <RegisterForm />
}
