import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { AuthHydrator } from "@/components/auth/AuthHydrator";

// Clean, professional sans-serif fonts. Roboto provides
// excellent readability and a modern corporate feel.
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  subsets: ["latin"],
});

// Roboto Condensed for headings — clean, impactful, corporate
const robotoCondensed = Roboto_Condensed({
  weight: ["400", "700"],
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vanguardiafinancial.com";
// Describes what the platform actually lists. The previous copy said "crypto"
// only, which undersold a catalogue that now spans four asset classes and left
// every equity, FX and commodity query unmatched.
const SITE_DESCRIPTION =
  "Trade stocks, crypto, forex and commodities in one platform — live market data across 380+ instruments, with charting, watchlists and portfolio tools.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vanguardia Financial — Stocks, Crypto, Forex & Commodities Trading",
    template: "%s | Vanguardia Financial",
  },
  // Tells search engines which URL is authoritative, so query strings and
  // trailing-slash variants do not compete with the page itself.
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
  keywords: [
    "online trading platform",
    "stock trading",
    "forex trading",
    "commodity trading",
    "cryptocurrency trading platform",
    "trading terminal",
    "live market data",
    "portfolio management",
    "CFD trading",
    "demo trading account",
  ],
  applicationName: "Vanguardia Financial",
  authors: [{ name: "Vanguardia Financial" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Vanguardia Financial",
    title: "Vanguardia Financial — Stocks, Crypto, Forex & Commodities Trading",
    description: SITE_DESCRIPTION,
    // Derived from SITE_URL rather than hardcoded, so a staging deploy does
    // not advertise the production domain as its canonical.
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/hero-skyline.jpg", width: 1600, height: 1067, alt: "Vanguardia Financial" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vanguardia Financial — Stocks, Crypto, Forex & Commodities Trading",
    description: SITE_DESCRIPTION,
    images: ["/hero-skyline.jpg"],
  },
};


/** Structured data describing the brand and site.
 *
 * Search engines use this to identify who runs the site rather than inferring
 * it from page copy — it is what lets a brand query return a knowledge panel
 * with the right name, logo and links instead of a plain blue link. */
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Vanguardia Financial",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
      description: SITE_DESCRIPTION,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@vanguardiafinancial.com",
        availableLanguage: ["English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Vanguardia Financial",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "FinancialProduct",
      name: "Vanguardia Financial trading platform",
      description:
        "Trade stocks, cryptocurrencies, forex pairs and commodities with live market data, charting and portfolio tools.",
      provider: { "@id": `${SITE_URL}/#organization` },
      category: ["Stock trading", "Cryptocurrency trading", "Forex trading", "Commodity trading"],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoCondensed.variable} h-full antialiased`}>
      <head>
        {/* Emitted in <head> so crawlers see it without executing the page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-navy-900">
        <AuthHydrator />
        {children}
      </body>
    </html>
  );
}
