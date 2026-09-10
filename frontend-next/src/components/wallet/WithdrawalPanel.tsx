'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { useWithdrawalsStore } from '@/store/withdrawalsStore'
import { toast } from '@/store/toastStore'
import type { TradingAccount } from '@/types/account'
import type { WithdrawalQuote, WithdrawalStatus } from '@/types/withdrawal'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime } from '@/lib/format'

const METHODS = [
  { key: 'BTC', label: 'Bitcoin', hint: 'BTC address' },
  { key: 'USDT', label: 'USDT (Tron)', hint: 'TRC20 address' },
  { key: 'TRX', label: 'Tron', hint: 'TRX address' },
  { key: 'bank', label: 'Bank transfer', hint: 'Account name, number and routing/IBAN' },
] as const

const STATUS_TONE: Record<WithdrawalStatus, 'neutral' | 'gain' | 'loss' | 'warning' | 'accent'> = {
  pending: 'warning',
  approved: 'accent',
  completed: 'gain',
  rejected: 'loss',
  cancelled: 'neutral',
}

/** Withdrawal requests for one account.
 *
 * Funds are held the moment a request is raised, so the withdrawable figure
 * drops immediately — that is deliberate, and the copy says so, because a
 * balance that silently changes after submitting looks like an error. */
export function WithdrawalPanel({ account }: { account: TradingAccount }) {
  const withdrawals = useWithdrawalsStore((s) => s.withdrawals)
  const fetchWithdrawals = useWithdrawalsStore((s) => s.fetchWithdrawals)
  const requestWithdrawal = useWithdrawalsStore((s) => s.requestWithdrawal)
  const cancelWithdrawal = useWithdrawalsStore((s) => s.cancelWithdrawal)
  const fetchQuote = useWithdrawalsStore((s) => s.fetchQuote)

  const [isOpen, setIsOpen] = useState(false)
  const [method, setMethod] = useState<string>('USDT')
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [memo, setMemo] = useState('')
  const [quote, setQuote] = useState<WithdrawalQuote | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isDemo = account.account_type === 'demo'

  const load = useCallback(() => {
    fetchWithdrawals(account.id).catch(() => undefined)
  }, [account.id, fetchWithdrawals])

  useEffect(load, [load])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetchQuote(account.id, method, Number(amount) || 0)
      .then((q) => {
        if (!cancelled) setQuote(q)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isOpen, account.id, method, amount, fetchQuote])

  async function submit() {
    setIsSaving(true)
    try {
      await requestWithdrawal({
        account_id: account.id,
        amount: Number(amount),
        method,
        destination: destination.trim(),
        destination_memo: memo.trim() || undefined,
      })
      toast.success('Withdrawal requested. Funds are held pending review.')
      setIsOpen(false)
      setAmount('')
      setDestination('')
      setMemo('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit the withdrawal.')
    } finally {
      setIsSaving(false)
    }
  }

  async function cancel(id: string) {
    try {
      await cancelWithdrawal(id)
      toast.success('Withdrawal cancelled and funds released.')
      load()
    } catch {
      toast.error('Could not cancel that withdrawal.')
    }
  }

  const rows = withdrawals.filter((w) => w.account_id === account.id)
  const selected = METHODS.find((m) => m.key === method)
  const netPreview = quote && Number(amount) > 0 ? quote.net_amount : null

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Withdrawals</h3>
          <p className="text-xs text-slate-500">
            {isDemo
              ? 'Demo accounts hold practice funds and cannot be withdrawn from.'
              : `${formatCurrency(account.withdrawable, account.currency)} available to withdraw`}
          </p>
        </div>
        <Button size="sm" disabled={isDemo} onClick={() => setIsOpen(true)}>
          Request withdrawal
        </Button>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState title="No withdrawals yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Fee</th>
                  <th className="py-2 pr-4">You receive</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="py-2.5 pr-4 tabular-nums font-medium text-navy-900">
                      {formatCurrency(w.amount, w.currency)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-500">{formatCurrency(w.fee, w.currency)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-navy-800">{formatCurrency(w.net_amount, w.currency)}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{w.method}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={STATUS_TONE[w.status]}>{w.status}</Badge>
                      {w.rejection_reason && (
                        <span className="mt-0.5 block max-w-[220px] truncate text-[11px] text-loss-600">
                          {w.rejection_reason}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDateTime(w.created_at)}</td>
                    <td className="py-2.5 text-right">
                      {w.status === 'pending' && (
                        <Button size="sm" variant="secondary" onClick={() => cancel(w.id)}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Withdraw from ${account.account_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              isLoading={isSaving}
              disabled={!amount || Number(amount) <= 0 || !destination.trim()}
            >
              Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Available to withdraw</span>
              <span className="font-semibold tabular-nums text-navy-900">
                {formatCurrency(quote?.withdrawable ?? account.withdrawable, account.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Promotional credits and margin backing open positions are not withdrawable.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-navy-800">Method</span>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    method === m.key ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span className="block font-medium text-navy-900">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-navy-800">Amount ({account.currency})</span>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Minimum ${quote?.minimum ?? '10.00'}`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-navy-800">Destination</span>
            <textarea
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              rows={method === 'bank' ? 3 : 2}
              maxLength={500}
              placeholder={selected?.hint}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </label>

          {method !== 'bank' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-navy-800">
                Memo / tag <span className="font-normal text-slate-500">(only if your exchange requires one)</span>
              </span>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          )}

          {quote && (
            <div className="space-y-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Fee</span>
                <span className="tabular-nums text-navy-800">{formatCurrency(quote.fee, account.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-navy-900">You receive</span>
                <span className="tabular-nums text-navy-900">
                  {netPreview ? formatCurrency(netPreview, account.currency) : '—'}
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            The amount is held as soon as you submit, so it stops being available to trade. An administrator reviews
            every request — once approved it is deducted from your account and appears in your transaction history.
            If it is declined the funds are returned to your balance.
          </p>
        </div>
      </Modal>
    </>
  )
}
