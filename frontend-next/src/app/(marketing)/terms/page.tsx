import type { Metadata } from 'next'

import { LegalContent } from '@/components/public/LegalContent'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing use of the Vanguardia Financial cryptocurrency trading platform.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalContent
      title="Terms of Service"
      effectiveDate="September 4, 2026"
      intro={
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Vanguardia Financial (the &ldquo;Platform&rdquo;),
          operated by Vanguardia Financial (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account or
          otherwise using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
        </p>
      }
      sections={[
        {
          id: 'nature-of-service',
          heading: '1. Nature of the Service',
          body: (
            <>
              <p>
                Vanguardia Financial is a cryptocurrency trading platform. Market prices displayed for supported assets are sourced from live, third-party cryptocurrency market data providers. The Platform provides access to cryptocurrency markets and portfolio management tools.
              </p>
              <p>
                By using the Platform, you acknowledge that cryptocurrency trading involves significant risk and that you are solely responsible for your trading decisions and their consequences.
              </p>
            </>
          ),
        },
        {
          id: 'eligibility',
          heading: '2. Eligibility & Account Registration',
          body: (
            <>
              <p>
                You must be at least 18 years old and capable of forming a binding contract to create an account. You agree to
                provide accurate registration information and to keep your credentials confidential. You are responsible for all
                activity that occurs under your account, whether or not you authorized it, except to the extent caused by our
                negligence.
              </p>
              <p>
                We may suspend or terminate accounts that provide false information, violate these Terms, or engage in fraudulent or prohibited activities.
              </p>
            </>
          ),
        },
        {
          id: 'no-investment-advice',
          heading: '3. No Investment Advice',
          body: (
            <p>
              Nothing on the Platform constitutes investment, financial, tax, or legal advice, or a recommendation or solicitation to buy or sell any asset. You should consult with qualified professionals before making investment decisions. Past performance is not indicative of future results.
            </p>
          ),
        },
        {
          id: 'acceptable-use',
          heading: '4. Acceptable Use',
          body: (
            <>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Attempt to gain unauthorized access to another user&apos;s account or to non-public areas of the Platform;</li>
                <li>Interfere with, disrupt, or place undue load on the Platform&apos;s infrastructure, including automated scraping or excessive API requests;</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the Platform except as permitted by law;</li>
                <li>Use the Platform for fraudulent, deceptive, or manipulative activities; or</li>
                <li>Use the Platform for any unlawful purpose.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'intellectual-property',
          heading: '5. Intellectual Property',
          body: (
            <p>
              The Platform, including its software, design, text, and original graphics, is owned by Vanguardia Financial and
              protected by applicable intellectual property laws. We grant you a limited, revocable, non-transferable license to
              access and use the Platform for personal, non-commercial purposes in accordance with these Terms. Third-party market
              data displayed on the Platform remains the property of its respective providers.
            </p>
          ),
        },
        {
          id: 'disclaimers',
          heading: '6. Disclaimers & Limitation of Liability',
          body: (
            <>
              <p>
                The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, express
                or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that
                the Platform will be uninterrupted, error-free, or that market data will be accurate, complete, or delivered without
                delay.
              </p>
              <p>
                To the fullest extent permitted by law, Vanguardia Financial and its affiliates will not be liable for any
                indirect, incidental, special, consequential, or punitive damages, or any loss of data or goodwill, arising from your
                use of or inability to use the Platform.
              </p>
            </>
          ),
        },
        {
          id: 'termination',
          heading: '7. Termination',
          body: (
            <p>
              You may stop using the Platform and close your account at any time. We may suspend or terminate your access to the
              Platform, with or without notice, if we reasonably believe you have violated these Terms or that doing so is necessary
              to protect the Platform, other users, or third parties.
            </p>
          ),
        },
        {
          id: 'changes',
          heading: '8. Changes to These Terms',
          body: (
            <p>
              We may update these Terms from time to time to reflect changes to the Platform or applicable law. We will update the
              &ldquo;Effective&rdquo; date above when we do. Continued use of the Platform after changes take effect constitutes
              acceptance of the revised Terms.
            </p>
          ),
        },
        {
          id: 'governing-law',
          heading: '9. Governing Law',
          body: (
            <p>
              These Terms are governed by the laws of the State of New York, without regard to conflict-of-law principles, except
              where local law requires otherwise.
            </p>
          ),
        },
        {
          id: 'contact',
          heading: '10. Contact',
          body: (
            <p>
              Questions about these Terms can be directed to Vanguardian Financial Inc., 1350 6th Avenue, New York, NY 10019.
            </p>
          ),
        },
      ]}
    />
  )
}
