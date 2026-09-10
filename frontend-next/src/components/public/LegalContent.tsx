import type { ReactNode } from 'react'

export interface LegalSection {
  id: string
  heading: string
  body: ReactNode
}

interface LegalContentProps {
  title: string
  effectiveDate: string
  intro: ReactNode
  sections: LegalSection[]
}

export function LegalContent({ title, effectiveDate, intro, sections }: LegalContentProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-navy-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">Effective {effectiveDate}</p>
        <div className="prose prose-slate mt-4 max-w-none text-sm leading-relaxed text-slate-600">{intro}</div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24 space-y-0.5 border-l border-slate-200 pl-4 text-sm">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded py-1 text-slate-500 transition-colors hover:text-navy-900">
                {s.heading}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-lg font-semibold text-navy-900">{s.heading}</h2>
              <div className="prose prose-slate mt-3 max-w-none space-y-3 text-sm leading-relaxed text-slate-600">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
