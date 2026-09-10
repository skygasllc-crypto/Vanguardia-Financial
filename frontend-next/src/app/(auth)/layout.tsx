import Link from 'next/link'

import { Logo } from '@/components/layout/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden w-1/2 flex-col justify-between bg-navy-950 p-12 text-white lg:flex">
        <Link href="/">
          <Logo dark wordmark={false} />
        </Link>
        <div>
          <blockquote className="font-display text-3xl font-semibold leading-tight">
            &ldquo;Financial clarity, professional tools, and a platform built on trust.&rdquo;
          </blockquote>
          
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Vanguard Financila Inc</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <Logo wordmark={false} />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
