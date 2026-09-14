import { useAccountStore } from '@/store/accountStore'
import { useAccountsStore } from '@/store/accountsStore'
import { useMarketStore } from '@/store/marketStore'
import { useOrdersStore } from '@/store/ordersStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { usePositionsStore } from '@/store/positionsStore'
import { useWsStore } from '@/store/wsStore'
import type { Order, Position, Trade } from '@/types/trading'

interface WsEnvelope {
  type: string
  payload: Record<string, unknown>
}

const RECONNECT_DELAY_MS = 2500
const SUMMARY_REFRESH_DELAY_MS = 400

class WebSocketService {
  private socket: WebSocket | null = null
  private token: string | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private manuallyClosed = false

  connect(token: string): void {
    this.token = token
    this.manuallyClosed = false
    this.open()
  }

  disconnect(): void {
    this.manuallyClosed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    this.socket?.close()
    this.socket = null
    useWsStore.getState().setStatus('disconnected')
  }

  subscribe(symbols: string[]): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'subscribe', symbols }))
    }
  }

  private open(): void {
    if (!this.token) return
    useWsStore.getState().setStatus('connecting')

    // The Next.js frontend is a separate origin from the FastAPI backend (no
    // dev proxy, unlike the Vite app), so the WebSocket always connects to
    // NEXT_PUBLIC_API_BASE_URL rather than the frontend's own host.
    const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
    const wsBase = apiOrigin.replace(/^http/, 'ws')
    const url = `${wsBase}/ws?token=${encodeURIComponent(this.token)}`
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      useWsStore.getState().setStatus('connected')
    }

    this.socket.onmessage = (event) => {
      try {
        const envelope: WsEnvelope = JSON.parse(event.data)
        this.dispatch(envelope)
      } catch {
        // Ignore malformed frames.
      }
    }

    this.socket.onclose = () => {
      useWsStore.getState().setStatus('disconnected')
      if (!this.manuallyClosed) {
        this.reconnectTimer = setTimeout(() => this.open(), RECONNECT_DELAY_MS)
      }
    }

    this.socket.onerror = () => {
      this.socket?.close()
    }
  }

  private dispatch(envelope: WsEnvelope): void {
    const { type, payload } = envelope

    switch (type) {
      case 'market.price_update':
        useMarketStore.getState().applyPriceTick(payload as never)
        break
      case 'position.updated':
      case 'position.profit_loss_updated':
        usePositionsStore.getState().upsertPosition(payload as unknown as Partial<Position> & { id: string })
        this.scheduleSummaryRefresh()
        break
      case 'position.closed':
        // Mark it closed in place. Removing the row here was why a position
        // closed in another tab (or by an admin) kept showing as open until a
        // manual reload: this client dropped it from the list instead of
        // reflecting the new state, and nothing re-rendered it as closed.
        usePositionsStore.getState().markClosed(payload as unknown as Partial<Position> & { id: string })
        this.scheduleSummaryRefresh()
        break
      case 'order.updated':
        // Orders and executions on another account (the demo one while the
        // user is on real, say) belong to that account's lists, not this one.
        if (!isForOtherAccount(payload)) useOrdersStore.getState().upsertOrder(payload as unknown as Order)
        break
      case 'trade.executed':
        if (!isForOtherAccount(payload)) useOrdersStore.getState().addTrade(payload as unknown as Trade)
        break
      case 'account.balance_updated':
        // May be for an account the user isn't viewing (a demo trade, an admin
        // funding the demo account). Merging it would show that balance on the
        // wrong account, so re-read the selected account's wallet instead.
        useAccountStore.getState().fetchWallet().catch(() => undefined)
        break
      case 'portfolio.updated':
        this.scheduleSummaryRefresh()
        break
      case 'admin.portfolio_updated':
      case 'admin.account_updated':
      case 'admin.position_updated':
      case 'admin.account_adjusted':
        this.scheduleSummaryRefresh()
        usePositionsStore.getState().fetchPositions().catch(() => undefined)
        break
      default:
        break
    }
  }

  /** Refresh the account-level figures (portfolio summary, account equity and
   * P&L) that are derived from open positions.
   *
   * A single price tick publishes one update per open position plus a
   * portfolio event for each, so refreshing per message fired a burst of
   * identical requests. They are coalesced into one. Accounts are included
   * because the account switcher and account cards otherwise keep the equity
   * and P&L from page load while the trade moves. */
  private scheduleSummaryRefresh(): void {
    if (this.refreshTimer) return
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null
      usePortfolioStore.getState().fetchPortfolio().catch(() => undefined)
      useAccountsStore.getState().fetchAccounts().catch(() => undefined)
    }, SUMMARY_REFRESH_DELAY_MS)
  }
}

/** True when an event names an account other than the selected one. Events
 * that name no account are applied as before. */
function isForOtherAccount(payload: Record<string, unknown>): boolean {
  const accountId = payload.account_id
  const activeAccountId = useAccountsStore.getState().activeAccountId
  return typeof accountId === 'string' && activeAccountId !== null && accountId !== activeAccountId
}

export const websocketService = new WebSocketService()
