'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { CopyField } from '@/components/common/CopyField'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { Spinner } from '@/components/common/Spinner'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import type { AdminWithdrawal, WithdrawalStatus } from '@/types/withdrawal'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime } from '@/lib/format'

const FILTERS: { key: WithdrawalStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const TONE: Record<WithdrawalStatus, 'neutral' | 'gain' | 'loss' | 'warning' | 'accent'> = {
  pending: 'warning', approved: 'accent', completed: 'gain', rejected: 'loss', cancelled: 'neutral',
}

/** The withdrawal review queue.
 *
 * Approving debits the user's account and writes the ledger entry, so the
 * withdrawal shows in their transaction history immediately. "Mark sent" is
 * bookkeeping after the fact — it attaches the transaction reference and
 * distinguishes "approved, not yet paid" from "paid".
 *
 * Rejecting an already-approved withdrawal refunds it through the ledger
 * rather than releasing a hold, because the money has already left. */
export default function AdminWithdrawalsPage() {
  // Tagged with the filter it was fetched for, so changing filter invalidates
  // it by comparison rather than by clearing state inside the effect.
  const [loaded, setLoaded] = useState<{ filter: string; rows: AdminWithdrawal[] } | null>(null)
  const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('pending')
  const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null)
  const [completing, setCompleting] = useState<AdminWithdrawal | null>(null)
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => {
    adminService
      .listWithdrawals(filter === 'all' ? undefined : filter)
      .then((rows) => setLoaded({ filter, rows }))
      .catch(() => {
        setLoaded({ filter, rows: [] })
        toast.error('Could not load withdrawals.')
      })
  }, [filter])

  useEffect(load, [load])

  async function act(fn: () => Promise<unknown>, message: string) {
    setIsSaving(true)
    try {
      await fn()
      toast.success(message)
      setRejecting(null)
      setCompleting(null)
      setReason('')
      setReference('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That action failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const rows = loaded?.filter === filter ? loaded.rows : null
  const pendingValue = (rows ?? [])
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Withdrawals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pendingValue > 0
              ? `${formatCurrency(pendingValue)} held across pending requests`
              : 'No funds currently held'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.key ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No withdrawals match this filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-navy-900">{w.user_full_name}</span>
                    <span className="block text-xs text-slate-500">{w.user_email}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-800">{w.account_number}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-navy-900">
                    {formatCurrency(w.amount, w.currency)}
                    <span className="block text-[11px] font-normal text-slate-400">fee {formatCurrency(w.fee, w.currency)}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-navy-800">{formatCurrency(w.net_amount, w.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="mb-0.5 block text-xs font-semibold text-slate-600">{w.method}</span>
                    <CopyField value={w.destination} label="Destination" />
                    {w.destination_memo && (
                      <div className="mt-1 rounded bg-amber-50 px-1.5 py-1">
                        <CopyField value={w.destination_memo} label="Memo — required" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[w.status]}>{w.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(w.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {w.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => act(() => adminService.approveWithdrawal(w.id), 'Approved — funds debited from the account.')}
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setRejecting(w)}>Reject</Button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <>
                          <Button size="sm" onClick={() => setCompleting(w)}>Mark sent</Button>
                          <Button size="sm" variant="danger" onClick={() => setRejecting(w)}>Reject</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={isSaving}
              disabled={!reason.trim()}
              onClick={() => rejecting && act(() => adminService.rejectWithdrawal(rejecting.id, reason.trim()), 'Rejected; funds released.')}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {rejecting?.status === 'approved'
              ? 'This withdrawal has already been debited, so rejecting it refunds the amount to the account. The reason is shown to the user.'
              : "The held funds return to the user's spendable balance immediately. The reason is shown to them."}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why is this being declined?"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </Modal>

      <Modal
        isOpen={completing !== null}
        onClose={() => setCompleting(null)}
        title="Mark payment sent"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleting(null)}>Cancel</Button>
            <Button
              isLoading={isSaving}
              onClick={() => completing && act(() => adminService.completeWithdrawal(completing.id, reference.trim() || undefined), 'Marked as sent.')}
            >
              Confirm sent
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            The account was already debited at approval. This records the payment reference and closes the request —
            do it once the funds have actually been sent.
          </p>
          {completing && (
            <div className="space-y-3 rounded-lg bg-slate-50 px-3.5 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Send exactly</span>
                <CopyField
                  value={String(completing.net_amount)}
                  mono
                  truncate={false}
                  className="items-center"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                <span className="shrink-0 text-slate-500">Method</span>
                <span className="text-xs font-semibold text-navy-900">{completing.method}</span>
              </div>
              {/* Untruncated here: this is the value being pasted into a
                  wallet, so it must be fully visible for a final check. */}
              <CopyField value={completing.destination} label="Destination address" truncate={false} />
              {completing.destination_memo && (
                <div className="rounded bg-amber-100/60 px-2 py-1.5">
                  <CopyField value={completing.destination_memo} label="Memo — omitting this can lose the funds" truncate={false} />
                </div>
              )}
            </div>
          )}
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={255}
            placeholder="Transaction hash or bank reference (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </div>
      </Modal>
    </div>
  )
}
