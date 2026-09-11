import Link from 'next/link'

import { Logo } from '@/components/layout/Logo'

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'Markets', href: '/markets' },
      { label: 'Trading Terminal', href: '/trade' },
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Learn', href: '/learn' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Security', href: '/security-overview' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Risk Disclosure', href: '/risk-disclosure' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: '+1-934-202-5711', href: 'tel:+19342025711' },
      { label: '+1-208-974-2356', href: 'tel:+12089742356' },
      { label: 'contact@vanguardiafinancial.com', href: 'mailto:contact@vanguardiafinancial.com' },
    ],
  },
]

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              A professional environment for tracking and trading digital assets. 
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-navy-900">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-500 hover:text-navy-800">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Vanguardia Financial. All rights reserved.</p>
          <p>Professional trading platform for all assets.</p>
        </div>
      </div>
    </footer>
  )
}
