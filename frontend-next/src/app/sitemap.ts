import type { MetadataRoute } from 'next'

// Required for `output: "export"` — these routes have no dynamic input, so
// force them to be emitted as static files at build time.
export const dynamic = 'force-static'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vanguardiafinancial.com'

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/markets', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/security-overview', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/investments', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/investments/stocks', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/investments/etfs', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/investments/mutual-funds', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/investments/money-market', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/investments/cds', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/login', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/register', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/risk-disclosure', changeFrequency: 'yearly', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
