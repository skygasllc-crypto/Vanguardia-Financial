'use client'

import { type ChangeEvent, type FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'

export function RegisterForm() {
  const register = useAuthStore((s) => s.register)
  const router = useRouter()

  const [form, setForm] = useState({ full_name: '', email: '', username: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register(form)
      router.replace('/app/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-500">Start with a $100,000 balance — free.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Input label="Full name" required value={form.full_name} onChange={update('full_name')} autoComplete="name" />
        <Input label="Email address" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
        <Input label="Username" required minLength={3} value={form.username} onChange={update('username')} autoComplete="username" />
        <Input
          label="Password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          hint="At least 8 characters, one uppercase letter, and one number."
        />

        {error && <p className="text-sm font-medium text-loss-600">{error}</p>}

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Create Account
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-400">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent-600 hover:text-accent-700">
          Log in
        </Link>
      </p>
    </div>
  )
}
