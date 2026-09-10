import { Modal } from '@/components/common/Modal'
import { OrderForm } from '@/components/trading/OrderForm'
import type { OrderSide } from '@/types/trading'

interface OrderTicketModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  currentPrice: number
  initialSide: OrderSide
}

/** The Buy/Sell order ticket, opened from the trading workspace's account
 * bar — mirrors placing an order from a WebTrader-style "Buy/Sell" button
 * rather than a permanently docked panel. */
export function OrderTicketModal({ isOpen, onClose, symbol, currentPrice, initialSide }: OrderTicketModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${symbol} — Place Order`}>
      <OrderForm symbol={symbol} currentPrice={currentPrice} initialSide={initialSide} />
    </Modal>
  )
}
