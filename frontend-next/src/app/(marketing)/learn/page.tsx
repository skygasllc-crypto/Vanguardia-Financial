import type { Metadata } from 'next'

import { Card } from '@/components/common/Card'

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'Plain-English guides to order types, portfolio risk, candlestick charts, and cryptocurrency trading — built for investors who want to understand what they are doing.',
  alternates: { canonical: '/learn' },
}

const ARTICLES = [
  {
    slug: 'order-types',
    category: 'Order Types',
    title: 'Market order vs. limit order',
    paragraphs: [
      'A market order tells the engine to fill immediately at the best price currently available — you trade certainty of execution for uncertainty of price. If BTC is trading at $91,240 and you place a market buy, your fill will land at or very close to that price, but during fast-moving conditions it can drift before the order completes.',
      'A limit order does the opposite: you set the exact price you are willing to pay (or accept, when selling), and the order only fills at that price or better. Set a limit buy at $90,000 while BTC trades at $91,240, and the order sits open — untouched — until the market comes to you, or you cancel it.',
    ],
    takeaway: 'Use market orders when speed matters more than price. Use limit orders when price matters more than speed.',
  },
  {
    slug: 'stop-limit-order',
    category: 'Order Types',
    title: 'Stop-limit orders',
    paragraphs: [
      'A stop-limit order is two orders chained together: a trigger price (the "stop") and an execution price (the "limit"). Nothing happens until the market touches your stop price — at that moment, the order converts into a limit order at the price you specified.',
      'For example, holding ETH at $3,000, you could set a stop at $2,850 with a limit of $2,830. If the price falls to $2,850, a sell order is placed with a $2,830 floor — protecting you from a much larger drop while still refusing to sell at an unacceptably low price. The tradeoff: if the price crashes straight through your limit without pausing, the order may not fill at all.',
    ],
    takeaway: 'Stop-limits give you control over the worst price you will accept, at the cost of a guaranteed fill.',
  },
  {
    slug: 'unrealized-vs-realized-pnl',
    category: 'Risk & Portfolio',
    title: 'Unrealized vs. realized P&L',
    paragraphs: [
      'Unrealized profit and loss is a mark-to-market snapshot — the current gain or loss on a position you still hold, recalculated continuously against the live price. Buy 1 BTC at $90,000 and watch the price climb to $95,000, and your unrealized P&L reads +$5,000. It is real information, but it is not locked in — it moves with the market and disappears if the price reverses.',
      'Realized P&L is what remains after you close the position. Sell that same BTC at $95,000, and the +$5,000 becomes a permanent entry in your trade history, unaffected by whatever the market does next. The distinction matters because a portfolio can look strong on unrealized gains alone while realizing almost nothing — discipline means knowing when to convert one into the other.',
    ],
    takeaway: 'Unrealized P&L is a forecast; realized P&L is a fact. Only one of them is final.',
  },
  {
    slug: 'diversify',
    category: 'Risk & Portfolio',
    title: 'Why diversify your portfolio',
    paragraphs: [
      'Concentrating your entire portfolio into a single asset maximizes both the upside and the downside — a 20% move in either direction impacts your whole account equally. Spreading your investments across five or six uncorrelated assets means no single price swing can move your total portfolio by more than a fraction of that.',
      'Diversification will not stop losses, and it will not make a bad investment thesis good — its purpose is narrower: reducing the odds that one wrong call determines your entire outcome. Building a properly diversified portfolio is fundamental to long-term investment success.',
    ],
    takeaway: 'Diversification manages the size of your mistakes, not whether you make them.',
  },
  {
    slug: 'candlestick-charts',
    category: 'Reading the Market',
    title: 'Reading a candlestick chart',
    paragraphs: [
      'Each candle summarizes price action over one interval — a minute, an hour, a day, whatever the chart is set to. The thick body spans the opening and closing price for that interval; the thin wicks above and below mark the highest and lowest price reached along the way.',
      'Color tells you the direction: a green (or unfilled) body means the close was higher than the open — buyers won that interval. A red (or filled) body means the close was lower than the open — sellers won. Long wicks with a small body signal a fight that ended close to where it started; a long body with short wicks signals a decisive, one-sided move.',
    ],
    takeaway: 'The body shows who won the interval; the wicks show how hard the other side fought back.',
  },
  {
    slug: 'getting-started',
    category: 'Getting Started',
    title: 'Getting started with cryptocurrency trading',
    paragraphs: [
      'Every skill that separates a disciplined trader from a reactive one — sizing a position correctly, choosing the right order type, managing risk through market volatility — is a habit built through careful planning and education. Vanguardia Financial provides you with professional-grade tools and comprehensive security to trade with confidence.',
      'With enterprise-grade security infrastructure, advanced encryption, and institutional-quality trading tools, you can focus on building your investment strategy. Our platform is designed to give you complete control while ensuring your assets remain protected at all times.',
    ],
    takeaway: 'Start trading with the confidence that comes from institutional-grade security and professional tools.',
  },
]

const CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)))

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-navy-900">Learn</h1>
        <p className="mt-3 text-slate-500">
          Plain-English resources for understanding digital assets, order types, and portfolio risk — built for investors who want to
          understand what they&apos;re doing, not just click buttons.
        </p>
      </div>

      <div className="mt-14 space-y-14">
        {CATEGORIES.map((category) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-accent-600">{category}</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {ARTICLES.filter((a) => a.category === category).map((a) => (
                <Card key={a.slug} id={a.slug} className="scroll-mt-24">
                  <h3 className="font-display text-lg font-semibold text-navy-900">{a.title}</h3>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                    {a.paragraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  <p className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-500">{a.takeaway}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
