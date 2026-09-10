'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import type { TradingAccount } from '@/types/account'
import { formatCurrency } from '@/lib/format'

/** Leverage tiers an admin may assign. Mirrors ALLOWED_LEVERAGE server-side —
 * the API rejects anything else, so the two lists must agree. */
const LEVERAGE_TIERS = [1, 2, 5, 10, 20, 30, 50, 100, 200, 400, 500]

/** Per-account admin controls: leverage and promotional funds.
 *
 * Both are deliberately admin-only. Leverage decides how much exposure a
 * balance can carry, and credits are money — neither belongs in the hands of the
 * account holder. */
export function AccountLeverageControls({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<TradingAccount[] | null>(null)
  const [editing, setEditing] = useState<TradingAccount | null>(null)
  const [leverage, setLeverage] = useState(1)
  const [reason, setReason] = useState('')
  const [creditsFor, setCreditsFor] = useState<TradingAccount | null>(null)
  const [creditsAmount, setCreditsAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const reload = () =>
    adminService
      .listUserAccounts(userId)
      .then(setAccounts)
      .catch(() => toast.error('Could not load accounts.'))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function saveLeverage() {
    if (!editing) return
    setIsSaving(true)
    try {
      await adminService.setAccountLeverage(editing.id, leverage, reason.trim() || undefined)
      toast.success(`${editing.account_number} set to 1:${leverage}.`)
      setEditing(null)
      setReason('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update leverage.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveCredits() {
    if (!creditsFor) return
    const amount = Number(creditsAmount)
    if (!amount || Number.isNaN(amount)) {
      toast.error('Enter an amount.')
      return
    }
    if (!reason.trim()) {
      toast.error('A reason is required.')
      return
    }
    setIsSaving(true)
    try {
      await adminService.adjustAccountBonus(creditsFor.id, amount, reason.trim())
      toast.success(`Credits updated on ${creditsFor.account_number}.`)
      setCreditsFor(null)
      setCreditsAmount('')
      setReason('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not adjust credits.')
    } finally {
      setIsSaving(false)
    }
  }

  if (accounts === null) return <Spinner />
  if (accounts.length === 0) return <p className="text-sm text-slate-500">This user has no accounts.</p>

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-4">Account</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Balance</th>
              <th className="py-2 pr-4">Credits</th>
              <th className="py-2 pr-4">Equity</th>
              <th className="py-2 pr-4">Margin</th>
              <th className="py-2 pr-4">Leverage</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 last:border-0">
                <td className="py-3 pr-4 font-mono text-xs font-semibold text-navy-900">
                  {a.account_number}
                  {a.label && <span className="block font-sans font-normal text-slate-400">{a.label}</span>}
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={a.account_type === 'demo' ? 'neutral' : 'gain'} className="uppercase">
                    {a.account_type}
                  </Badge>
                </td>
                <td className="py-3 pr-4 tabular-nums">{formatCurrency(a.balance, a.currency)}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-500">{formatCurrency(a.bonus, a.currency)}</td>
                <td className="py-3 pr-4 tabular-nums font-medium text-navy-900">{formatCurrency(a.equity, a.currency)}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-500">
                  {formatCurrency(a.margin_used, a.currency)}
                  {a.margin_level !== null && (
                    <span className="block text-[11px]">{Number(a.margin_level).toFixed(0)}%</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <Badge tone="accent">1:{a.leverage}</Badge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(a)
                        setLeverage(a.leverage)
                        setReason('')
                      }}
                    >
                      Leverage
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCreditsFor(a)
                        setCreditsAmount('')
                        setReason('')
                      }}
                    >
                      Credits
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={`Leverage — ${editing?.account_number ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveLeverage} isLoading={isSaving}>Set 1:{leverage}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {LEVERAGE_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setLeverage(tier)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                  leverage === tier ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                1:{tier}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Open positions keep the margin they were opened with, so lowering leverage cannot force a stop-out on
            trades that were already running.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Reason (recorded in the audit log)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </Modal>

      <Modal
        isOpen={creditsFor !== null}
        onClose={() => setCreditsFor(null)}
        title={`Credits — ${creditsFor?.account_number ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreditsFor(null)}>Cancel</Button>
            <Button onClick={saveCredits} isLoading={isSaving}>Apply</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Credits are added to the tradeable balance but excluded from withdrawable funds. Use a negative amount
            to claw them back.
          </p>
          <input
            type="number"
            step="any"
            value={creditsAmount}
            onChange={(e) => setCreditsAmount(e.target.value)}
            placeholder="e.g. 500 or -500"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Reason (required)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </Modal>
    </>
  )
}
