'use client'

import { type FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'

export function LoginForm() {
  const login = useAuthStore((s) => s.login)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/app/dashboard'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      router.replace(redirectTo)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to log in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">Log in to access your portfolio and trading terminal.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm font-medium text-loss-600">{error}</p>}

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Log In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-accent-600 hover:text-accent-700">
          Create one
        </Link>
      </p>

      
    </div>
  )
}
