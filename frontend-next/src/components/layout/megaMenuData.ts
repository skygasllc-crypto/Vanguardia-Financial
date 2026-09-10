export interface MegaMenuLink {
  label: string
  href: string
  description?: string
}

export interface MegaMenuColumn {
  heading: string
  links: MegaMenuLink[]
}

export interface MegaMenuItem {
  label: string
  columns: MegaMenuColumn[]
}

export const MEGA_MENU: MegaMenuItem[] = [
  {
    label: 'Products & Services',
    columns: [
      {
        heading: 'Ways to Trade',
        links: [
          { label: 'Trading Terminal', href: '/app/trade' },
          { label: 'Market Orders', href: '/app/trade' },
          { label: 'Limit Orders', href: '/app/trade' },
          { label: 'Stop-Limit Orders', href: '/app/trade' },
          { label: 'Trading Guide', href: '/learn#order-types' },
        ],
      },
      {
        heading: 'Crypto Markets',
        links: [
          { label: 'All Cryptocurrencies', href: '/markets' },
          { label: 'Trending Assets', href: '/markets' },
          { label: 'Top Gainers & Losers', href: '/markets' },
          { label: 'New Listings', href: '/markets' },
          { label: 'Bitcoin', href: '/markets/asset?symbol=BTC' },
          { label: 'Ethereum', href: '/markets/asset?symbol=ETH' },
        ],
      },
      {
        heading: 'Investment Products',
        links: [
          { label: 'Investment Products Overview', href: '/investments' },
          { label: 'Stocks', href: '/investments/stocks' },
          { label: 'ETFs', href: '/investments/etfs' },
          { label: 'Mutual Funds', href: '/investments/mutual-funds' },
          { label: 'Money Market Funds', href: '/investments/money-market' },
          { label: 'CDs', href: '/investments/cds' },
        ],
      },
      {
        heading: 'Accounts & Plans',
        links: [
          { label: 'Dashboard', href: '/app/dashboard' },
          { label: 'Portfolio', href: '/app/portfolio' },
          { label: 'Wallet', href: '/app/wallet' },
          { label: 'Security Settings', href: '/app/security' },
        ],
      },
      {
        heading: 'Account Activity',
        links: [
          { label: 'Watchlist', href: '/app/watchlist' },
          { label: 'Transaction History', href: '/app/wallet' },
          { label: 'Trade History', href: '/app/portfolio' },
          { label: 'Order History', href: '/app/trade' },
        ],
      },
    ],
  },
  {
    label: 'Who We Are',
    columns: [
      {
        heading: 'About Us',
        links: [
          { label: 'About Vanguardia Financial', href: '/about' },
          { label: 'Frequently Asked Questions', href: '/#faq' },
        ],
      },
      {
        heading: "Client Benefits",
        links: [
          { label: 'Why Choose Vanguardia Financial', href: '/about' },
          { label: 'Platform Features', href: '/#platform-features' },
        ],
      },
      {
        heading: 'Trust & Security',
        links: [
          { label: 'Security Architecture', href: '/security-overview' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Risk Disclosure', href: '/risk-disclosure' },
        ],
      },
    ],
  },
  {
    label: 'Resources & Education',
    columns: [
      {
        heading: 'Goals',
        links: [
          { label: 'Understanding Order Types', href: '/learn#order-types' },
          { label: 'Managing Risk with Stop-Limit Orders', href: '/learn#stop-limit-order' },
          { label: 'Building a Diversified Portfolio', href: '/learn#diversify' },
          { label: 'Getting Started with Trading', href: '/learn#order-types' },
        ],
      },
      {
        heading: 'Current Insights',
        links: [
          { label: 'Market Summary', href: '/markets' },
          { label: 'Realized vs. Unrealized P&L', href: '/learn#unrealized-vs-realized-pnl' },
          { label: 'Reading Candlestick Charts', href: '/learn#candlestick-charts' },
          { label: 'Risk Disclosure', href: '/risk-disclosure' },
        ],
      },
    ],
  },
]
