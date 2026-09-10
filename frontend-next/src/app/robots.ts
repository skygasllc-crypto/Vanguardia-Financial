import type { MetadataRoute } from 'next'

// Required for `output: "export"` — these routes have no dynamic input, so
// force them to be emitted as static files at build time.
export const dynamic = 'force-static'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vanguardiafinancial.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The authenticated investor app and the admin console require login
      // and redirect anonymous visitors to /login — nothing there is
      // crawlable content, so keep it out of the index and off crawl budget.
      disallow: ['/app/', '/admin/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
