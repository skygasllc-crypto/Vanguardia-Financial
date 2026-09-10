'use client'

import { useState } from 'react'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAccountStore } from '@/store/accountStore'
import { useAccountTypeStore } from '@/store/accountTypeStore'
import { useAccountsStore } from '@/store/accountsStore'
import { useOrdersStore } from '@/store/ordersStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import { toast } from '@/store/toastStore'
import type { OrderSide, OrderType } from '@/types/trading'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

const ORDER_TYPES: { key: OrderType; label: string }[] = [
  { key: 'market', label: 'Market' },
  { key: 'limit', label: 'Limit' },
  { key: 'stop_limit', label: 'Stop Limit' },
]

export function OrderForm({ symbol, currentPrice, initialSide = 'buy' }: { symbol: string; currentPrice: number; initialSide?: OrderSide }) {
  const wallet = useAccountStore((s) => s.wallet)
  const summary = usePortfolioStore((s) => s.summary)
  const accountType = useAccountTypeStore((s) => s.accountType)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const placeOrder = useOrdersStore((s) => s.placeOrder)
  const isSubmitting = useOrdersStore((s) => s.isSubmitting)

  const [side, setSide] = useState<OrderSide>(initialSide)
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [showBrackets, setShowBrackets] = useState(false)

  const effectivePrice = orderType === 'market' ? currentPrice : Number(price || 0)
  const estimatedTotal = effectivePrice * Number(quantity || 0)
  const availableBalance = Number(summary?.available_cash_balance ?? wallet?.available_balance ?? 0)
  const insufficientFunds = side === 'buy' && estimatedTotal > availableBalance

  async function handleSubmit() {
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity.')
      return
    }
    if (orderType !== 'market' && (!price || Number(price) <= 0)) {
      toast.error('Enter a valid price.')
      return
    }
    if (orderType === 'stop_limit' && (!stopPrice || Number(stopPrice) <= 0)) {
      toast.error('Enter a valid stop price.')
      return
    }

    // Catch a transposed pair here rather than letting the server reject it —
    // a bracket on the wrong side of the entry can never fill as intended.
    const tp = takeProfit ? Number(takeProfit) : undefined
    const sl = stopLoss ? Number(stopLoss) : undefined
    if (tp !== undefined && sl !== undefined) {
      if (side === 'buy' && tp <= sl) {
        toast.error('Profit limit must be above the stop limit for a buy.')
        return
      }
      if (side === 'sell' && tp >= sl) {
        toast.error('Profit limit must be below the stop limit for a sell.')
        return
      }
    }

    try {
      const order = await placeOrder({
        symbol,
        side,
        order_type: orderType,
        quantity: qty,
        price: orderType !== 'market' ? Number(price) : undefined,
        stop_price: orderType === 'stop_limit' ? Number(stopPrice) : undefined,
        take_profit_price: tp,
        stop_loss_price: sl,
        account_type: accountType,
        // Names the exact account. Without it the backend falls back to the
        // primary account of this type, which silently ignores the user's
        // selection once they hold more than one.
        account_id: activeAccountId ?? undefined,
      })
      toast.success(
        order.status === 'filled'
          ? `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${symbol} at ${formatCurrency(order.filled_price ?? currentPrice)}.`
          : `${orderType.replace('_', ' ')} order placed and is now open.`,
      )
      setQuantity('')
      setPrice('')
      setStopPrice('')
      setTakeProfit('')
      setStopLoss('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order failed.')
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setSide('buy')}
          className={cn('rounded-md py-2 text-sm font-semibold transition-colors', side === 'buy' ? 'bg-gain-500 text-white' : 'text-slate-600')}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn('rounded-md py-2 text-sm font-semibold transition-colors', side === 'sell' ? 'bg-loss-500 text-white' : 'text-slate-600')}
        >
          Sell
        </button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-50 p-1">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setOrderType(t.key)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
              orderType === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orderType !== 'market' && (
          <Input
            label="Price (USD)"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={currentPrice.toFixed(2)}
          />
        )}
        {orderType === 'stop_limit' && (
          <Input
            label="Stop Price (USD)"
            type="number"
            min="0"
            step="any"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
          />
        )}
        <Input
          label={`Quantity (${symbol})`}
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
        />

        {/* Optional exit brackets. Collapsed by default so the common path
            stays a two-field ticket, and both are optional: an order with
            neither is simply unbracketed. */}
        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setShowBrackets((v) => !v)}
            aria-expanded={showBrackets}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-medium text-navy-800"
          >
            Profit limit &amp; stop limit
            <span className="text-xs font-normal text-slate-500">
              {takeProfit || stopLoss ? 'Set' : 'Optional'}
            </span>
          </button>
          {showBrackets && (
            <div className="border-t border-slate-100 p-3.5">
              {/* Side by side: stacking these pushed the ticket well past the
                  dialog height the moment the section was opened. */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Profit limit"
                  type="number"
                  min="0"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder={side === 'buy' ? 'Above entry' : 'Below entry'}
                />
                <Input
                  label="Stop limit"
                  type="number"
                  min="0"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder={side === 'buy' ? 'Below entry' : 'Above entry'}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Recorded on the position and shown in order history. Not auto-executed yet — close from the
                positions table.
              </p>
            </div>
          )}
        </div>

        {/* Cost summary and the submit action stay pinned to the bottom of the
            ticket. Expanding the exit brackets makes the form taller than the
            dialog, and a button that scrolls out of reach is the one control
            that must never be unreachable. */}
        <div className="sticky bottom-0 -mx-6 -mb-6 space-y-2 border-t border-slate-100 bg-white px-6 pb-6 pt-3">
          <div className="flex justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
            <span className="text-slate-500">Estimated Total</span>
            <span className="font-semibold tabular-nums text-navy-900">{formatCurrency(estimatedTotal || 0)}</span>
          </div>
          <div className="flex justify-between px-1 text-xs text-slate-500">
            <span>Available Balance</span>
            <span className="tabular-nums">{formatCurrency(availableBalance)}</span>
          </div>

          {insufficientFunds && <p className="text-xs font-medium text-loss-600">Insufficient available balance for this order.</p>}

          <Button
            variant={side === 'buy' ? 'buy' : 'sell'}
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={insufficientFunds}
            onClick={handleSubmit}
          >
            Place {side === 'buy' ? 'Buy' : 'Sell'} Order
          </Button>
        </div>
      </div>
    </div>
  )
}
