'use client'

import { useState } from 'react'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/format'

export function BalanceAdjustmentForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [type, setType] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [internalReference, setInternalReference] = useState('')
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function proceedToConfirm() {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    if (reason.trim().length < 3) {
      toast.error('A reason is required for every adjustment.')
      return
    }
    setStep('confirm')
  }

  async function submit() {
    setIsSubmitting(true)
    try {
      await adminService.adjustBalance(userId, {
        adjustment_type: type,
        amount: Number(amount),
        currency: 'USD',
        reason,
        internal_reference: internalReference || undefined,
        notes: notes || undefined,
      })
      toast.success('Balance adjustment applied and recorded in the ledger.')
      setAmount('')
      setReason('')
      setInternalReference('')
      setNotes('')
      setStep('form')
      onSaved()
    } catch {
      toast.error('Could not apply balance adjustment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <Row label="Adjustment Type" value={type === 'credit' ? 'Add Funds' : 'Subtract Funds'} />
          <Row label="Amount" value={formatCurrency(amount)} />
          <Row label="Reason" value={reason} />
          {internalReference && <Row label="Internal Reference" value={internalReference} />}
        </div>
        <p className="text-xs text-slate-500">This will create an immutable ledger entry and update the user's available balance immediately.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setStep('form')}>Back</Button>
          <Button onClick={submit} isLoading={isSubmitting}>Confirm Adjustment</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setType('credit')}
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${type === 'credit' ? 'bg-gain-500 text-white' : 'text-slate-600'}`}
        >
          Add Funds
        </button>
        <button
          onClick={() => setType('debit')}
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${type === 'debit' ? 'bg-loss-500 text-white' : 'text-slate-600'}`}
        >
          Subtract Funds
        </button>
      </div>
      <Input label="Amount (USD)" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Trading loss correction" />
      <Input label="Internal Reference (optional)" value={internalReference} onChange={(e) => setInternalReference(e.target.value)} />
      <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button fullWidth onClick={proceedToConfirm}>Review Adjustment</Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-navy-900">{value}</span>
    </div>
  )
}
