'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { api } from '@/lib/apiClient'
import { toast } from '@/store/toastStore'
import type { Deposit, DepositListResponse } from '@/types/deposit'

export default function AdminDepositsPage() {
  const [pendingDeposits, setPendingDeposits] = useState<Deposit[]>([])
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPendingDeposits()
    fetchAllDeposits()
  }, [])

  async function fetchPendingDeposits() {
    try {
      const data = await api.get<DepositListResponse>('/deposits/admin/deposits/pending')
      setPendingDeposits(data.deposits)
    } catch (error) {
      toast.error('Failed to load pending deposits')
    }
  }

  async function fetchAllDeposits() {
    try {
      const data = await api.get<DepositListResponse>('/deposits/admin/deposits')
      setAllDeposits(data.deposits)
    } catch (error) {
      toast.error('Failed to load deposit history')
    }
  }

  async function handleConfirmDeposit(depositId: string, depositAmount: string) {
    const amount = parseFloat(editingAmounts[depositId] || depositAmount)

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid deposit amount greater than 0')
      return
    }

    setConfirmingId(depositId)
    setIsLoading(true)
    try {
      await api.post(`/deposits/admin/deposits/${depositId}/confirm`, { amount })
      toast.success('Deposit confirmed and user account credited successfully')
      await fetchPendingDeposits()
      await fetchAllDeposits()
      // Clear the editing amount
      setEditingAmounts((prev) => {
        const next = { ...prev }
        delete next[depositId]
        return next
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm deposit')
    } finally {
      setIsLoading(false)
      setConfirmingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge tone="warning">Pending</Badge>
      case 'user_paid':
        return <Badge tone="neutral">User Marked Paid</Badge>
      case 'confirming':
        return <Badge tone="neutral">Confirming</Badge>
      case 'confirmed':
      case 'credited':
        return <Badge tone="gain">Credited</Badge>
      case 'failed':
        return <Badge tone="loss">Failed</Badge>
      case 'cancelled':
        return <Badge tone="neutral">Cancelled</Badge>
      default:
        return <Badge tone="neutral">{status}</Badge>
    }
  }

  const recentDeposits = allDeposits.slice(0, 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Deposit Management</h1>
        <p className="mt-2 text-slate-600">Review and approve user deposit requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Confirmation</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy-900">{pendingDeposits.length}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Deposits</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy-900">{allDeposits.length}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm font-medium text-slate-500">Credited Today</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy-900">
              {allDeposits.filter((d) => d.status === 'credited' && new Date(d.admin_confirmed_at || '').toDateString() === new Date().toDateString()).length}
            </p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm font-medium text-slate-500">Failed/Cancelled</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy-900">
              {allDeposits.filter((d) => d.status === 'failed' || d.status === 'cancelled').length}
            </p>
          </div>
        </Card>
      </div>

      {/* Pending Deposits - Awaiting Admin Confirmation */}
      <Card>
        <CardHeader title="Pending Deposits - Awaiting Confirmation" />
        {pendingDeposits.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-900">No pending deposits</p>
            <p className="mt-1 text-xs text-slate-500">Deposits marked as paid by users will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">User Marked Paid</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingDeposits.map((deposit) => (
                  <tr key={deposit.id} className="text-sm">
                    <td className="py-4">
                      <span className="font-mono text-xs text-slate-600">{String(deposit.user_id).slice(0, 8)}...</span>
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-navy-900">{deposit.currency_symbol}</div>
                      <div className="text-xs text-slate-500">{deposit.currency_id}</div>
                    </td>
                    <td className="py-4 text-slate-600">{deposit.network}</td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.00000001"
                          min="0"
                          value={editingAmounts[deposit.id] ?? deposit.amount}
                          onChange={(e) =>
                            setEditingAmounts((prev) => ({
                              ...prev,
                              [deposit.id]: e.target.value,
                            }))
                          }
                          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm font-semibold tabular-nums text-navy-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        <div className="text-xs text-slate-500">{deposit.currency_symbol}</div>
                        {deposit.network_fee && <div className="text-xs text-slate-500">Fee: {deposit.network_fee}</div>}
                      </div>
                    </td>
                    <td className="py-4">{getStatusBadge(deposit.status)}</td>
                    <td className="py-4 text-slate-600">
                      {deposit.user_marked_paid_at ? (
                        <div>
                          <div className="text-sm">{new Date(deposit.user_marked_paid_at).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500">{new Date(deposit.user_marked_paid_at).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 text-slate-600">{new Date(deposit.created_at).toLocaleDateString()}</td>
                    <td className="py-4">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleConfirmDeposit(deposit.id, deposit.amount)}
                        isLoading={isLoading && confirmingId === deposit.id}
                        disabled={isLoading}
                      >
                        Complete Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Deposits */}
      <Card>
        <CardHeader title="Recent Deposits" />
        {recentDeposits.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-900">No deposit history</p>
            <p className="mt-1 text-xs text-slate-500">All deposits will be listed here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Credited</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Confirmed</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDeposits.map((deposit) => (
                  <tr key={deposit.id} className="text-sm">
                    <td className="py-4">
                      <span className="font-mono text-xs text-slate-600">{String(deposit.user_id).slice(0, 8)}...</span>
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-navy-900">{deposit.currency_symbol}</div>
                      <div className="text-xs text-slate-500">{deposit.currency_id}</div>
                    </td>
                    <td className="py-4 text-slate-600">{deposit.network}</td>
                    <td className="py-4 font-semibold tabular-nums text-navy-900">
                      {deposit.amount} {deposit.currency_symbol}
                    </td>
                    <td className="py-4">
                      {deposit.credited_amount ? (
                        <span className="font-semibold tabular-nums text-gain-600">
                          +{deposit.credited_amount} {deposit.currency_symbol}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4">{getStatusBadge(deposit.status)}</td>
                    <td className="py-4 text-slate-600">{new Date(deposit.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-slate-600">
                      {deposit.admin_confirmed_at ? new Date(deposit.admin_confirmed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4">
                      {(deposit.status === 'pending' || deposit.status === 'user_paid') && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConfirmDeposit(deposit.id, deposit.amount)}
                          isLoading={isLoading && confirmingId === deposit.id}
                          disabled={isLoading}
                        >
                          Complete Payment
                        </Button>
                      )}
                      {deposit.status === 'credited' && (
                        <span className="text-xs font-medium text-green-600">✓ Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
