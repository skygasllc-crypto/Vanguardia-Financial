'use client'

import { useState } from 'react'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/format'
import type { Position } from '@/types/trading'

interface PositionManipulationControlsProps {
  position: Position
  onManipulated?: () => void
}

export function PositionManipulationControls({ position, onManipulated }: PositionManipulationControlsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [pnlAmount, setPnlAmount] = useState(String(position.unrealized_profit_loss))
  const [pnlPct, setPnlPct] = useState(String(position.unrealized_profit_loss_pct))
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUnpinning, setIsUnpinning] = useState(false)
  // A P&L or price edit pins the position; it ignores the market until unpinned.
  const isPinned = position.admin_price_override != null

  function openModal() {
    setPnlAmount(String(position.unrealized_profit_loss))
    setPnlPct(String(position.unrealized_profit_loss_pct))
    setReason('')
    setModalOpen(true)
  }

  async function submit() {
    const pnl = Number(pnlAmount)

    if (isNaN(pnl)) {
      toast.error('Enter a valid P&L amount.')
      return
    }

    setIsSubmitting(true)
    try {
      if (pnl >= 0) {
        await adminService.forceProfit(position.id, Math.abs(pnl), reason || undefined)
        toast.success(`Position P&L set to +${formatCurrency(Math.abs(pnl))}`)
      } else {
        await adminService.forceLoss(position.id, Math.abs(pnl), reason || undefined)
        toast.success(`Position P&L set to -${formatCurrency(Math.abs(pnl))}`)
      }
      setModalOpen(false)
      onManipulated?.()
    } catch {
      toast.error('Failed to update position.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function unpin() {
    setIsUnpinning(true)
    try {
      await adminService.unpinPosition(position.id)
      toast.success(`${position.symbol} position unpinned. It follows the market again.`)
      onManipulated?.()
    } catch {
      toast.error('Failed to unpin position.')
    } finally {
      setIsUnpinning(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={openModal}
          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          Edit P&L
        </Button>
        {isPinned && (
          <Button size="sm" variant="secondary" onClick={unpin} isLoading={isUnpinning}>
            Unpin
          </Button>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Position P&L"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="mb-2 font-semibold text-navy-900">{position.symbol}</div>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-medium">{position.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Entry Price:</span>
                <span className="font-medium">{formatCurrency(position.average_entry_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Invested Amount:</span>
                <span className="font-medium">{formatCurrency(position.total_cost_basis)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium capitalize">{position.status}</span>
              </div>
            </div>
          </div>

          <Input
            label="P&L Amount (USD)"
            type="number"
            step="any"
            value={pnlAmount}
            onChange={(e) => {
              setPnlAmount(e.target.value)
              // Auto-calculate P&L%
              const pnl = Number(e.target.value)
              const costBasis = Number(position.total_cost_basis)
              if (costBasis > 0 && !isNaN(pnl)) {
                const pct = (pnl / costBasis) * 100
                setPnlPct(pct.toFixed(2))
              }
            }}
            placeholder="500.00 for profit, -500.00 for loss"
          />

          <Input
            label="P&L Percentage (%)"
            type="number"
            step="any"
            value={pnlPct}
            onChange={(e) => {
              setPnlPct(e.target.value)
              // Auto-calculate P&L amount
              const pct = Number(e.target.value)
              const costBasis = Number(position.total_cost_basis)
              if (!isNaN(pct)) {
                const pnl = (pct / 100) * costBasis
                setPnlAmount(pnl.toFixed(2))
              }
            }}
            placeholder="5.50 for profit, -5.50 for loss"
          />

          <Input
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Admin manipulation for demo"
          />

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-semibold">Preview:</div>
            <div className="mt-1">
              User will see{' '}
              <span className={Number(pnlAmount) >= 0 ? 'font-bold text-gain-600' : 'font-bold text-loss-600'}>
                {Number(pnlAmount) >= 0 ? '+' : ''}
                {formatCurrency(pnlAmount)} ({Number(pnlPct) >= 0 ? '+' : ''}{Number(pnlPct).toFixed(2)}%)
              </span>{' '}
              instantly via WebSocket
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={isSubmitting}>
              Update P&L
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
