import { useAccountStore } from '@/store/accountStore'
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

class WebSocketService {
  private socket: WebSocket | null = null
  private token: string | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manuallyClosed = false

  connect(token: string): void {
    this.token = token
    this.manuallyClosed = false
    this.open()
  }

  disconnect(): void {
    this.manuallyClosed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
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
        usePortfolioStore.getState().fetchPortfolio().catch(() => undefined)
        break
      case 'position.closed':
        // Mark it closed in place. Removing the row here was why a position
        // closed in another tab (or by an admin) kept showing as open until a
        // manual reload: this client dropped it from the list instead of
        // reflecting the new state, and nothing re-rendered it as closed.
        usePositionsStore.getState().markClosed(payload as unknown as Partial<Position> & { id: string })
        usePortfolioStore.getState().fetchPortfolio().catch(() => undefined)
        break
      case 'order.updated':
        useOrdersStore.getState().upsertOrder(payload as unknown as Order)
        break
      case 'trade.executed':
        useOrdersStore.getState().addTrade(payload as unknown as Trade)
        break
      case 'account.balance_updated':
        useAccountStore.getState().applyBalanceUpdate(payload as never)
        break
      case 'portfolio.updated':
      case 'admin.portfolio_updated':
      case 'admin.account_updated':
      case 'admin.position_updated':
      case 'admin.account_adjusted':
        usePortfolioStore.getState().fetchPortfolio().catch(() => undefined)
        usePositionsStore.getState().fetchPositions().catch(() => undefined)
        break
      default:
        break
    }
  }
}

export const websocketService = new WebSocketService()
