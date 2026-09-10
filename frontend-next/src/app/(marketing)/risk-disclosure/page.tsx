import type { Metadata } from 'next'

import { LegalContent } from '@/components/public/LegalContent'

export const metadata: Metadata = {
  title: 'Risk Disclosure',
  description: 'Important disclosures about cryptocurrency trading risks and platform policies.',
  alternates: { canonical: '/risk-disclosure' },
}

export default function RiskDisclosurePage() {
  return (
    <LegalContent
      title="Risk Disclosure"
      effectiveDate="September 20, 2021"
      intro={
        <p>
          Please read this disclosure carefully before using Vanguardia Financial. Cryptocurrency trading carries significant risks and may not be suitable for all investors.
        </p>
      }
      sections={[
        {
          id: 'market-volatility',
          heading: '1. Market Volatility',
          body: (
            <p>
              Cryptocurrency markets are highly volatile. Prices can fluctuate dramatically in short periods of time. Past performance is not indicative of future results. You should carefully consider your risk tolerance before trading.
            </p>
          ),
        },
        {
          id: 'market-data',
          heading: '2. Market Data',
          body: (
            <p>
              Asset prices shown on the Platform are sourced from third-party cryptocurrency market data providers. Market data may be delayed or temporarily unavailable during periods of high volatility, technical issues, or provider outages.
            </p>
          ),
        },
        {
          id: 'trading-risks',
          heading: '3. Trading Risks',
          body: (
            <p>
              Trading cryptocurrencies involves risk of loss. Market conditions can change rapidly. You should be aware of trading fees, potential slippage, and tax consequences. Never invest more than you can afford to lose.
            </p>
          ),
        },
        {
          id: 'no-advice',
          heading: '4. No Investment, Financial, or Tax Advice',
          body: (
            <p>
              Nothing on the Platform — including asset descriptions, market data, charts, or educational content in our Learn
              section — is investment, financial, legal, or tax advice, or a recommendation to buy, sell, or hold any asset. Consult a
              licensed, independent professional before making real-world financial decisions.
            </p>
          ),
        },
        {
          id: 'account-security',
          heading: '5. Account Security',
          body: (
            <p>
              You are responsible for maintaining the security of your account credentials. Use strong passwords and enable two-factor authentication when available. Report any unauthorized account access immediately.
            </p>
          ),
        },
        {
          id: 'technology-risk',
          heading: '6. Technology & Availability',
          body: (
            <p>
              The Platform may experience downtime, technical issues, or data delays. We do not guarantee uninterrupted access to the Platform. Maintenance windows and system updates will be communicated when possible.
            </p>
          ),
        },
        {
          id: 'regulatory',
          heading: '7. Regulatory Compliance',
          body: (
            <p>
              Cryptocurrency regulations vary by jurisdiction. You are responsible for ensuring your use of the Platform complies with applicable laws in your location. Consult with legal and tax professionals as needed.
            </p>
          ),
        },
        {
          id: 'contact',
          heading: '8. Contact',
          body: (
            <>
              <p>
                Questions about this Risk Disclosure can be directed to Vanguardia Financial:
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>Address: 1350 6th Avenue, New York, NY 10019</li>
                <li>Phone: +1-934-202-5711 or +1-208-974-2356</li>
                <li>Email: contact@vanguardiafinancial.com</li>
                <li>Website: vanguardiafinancial.com</li>
              </ul>
            </>
          ),
        },
      ]}
    />
  )
}
