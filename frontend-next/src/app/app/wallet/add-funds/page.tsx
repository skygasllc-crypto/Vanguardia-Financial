'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { DepositQrCode } from '@/components/wallet/DepositQrCode'
import { useAccountsStore } from '@/store/accountsStore'
import { Badge } from '@/components/common/Badge'
import { formatCurrency } from '@/lib/format'
import { useAccountStore } from '@/store/accountStore'
import { api } from '@/lib/apiClient'
import { toast } from '@/store/toastStore'
import type { Deposit, DepositWallet, DepositListResponse } from '@/types/deposit'

function AddFundsInner() {
  const wallet = useAccountStore((s) => s.wallet)
  const [wallets, setWallets] = useState<DepositWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<DepositWallet | null>(null)
  // Set when the user arrived from a specific account's "Deposit" button.
  const searchParams = useSearchParams()
  const targetAccountId = searchParams.get('account')
  const accounts = useAccountsStore((s) => s.accounts)
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts)
  const targetAccount = accounts.find((a) => a.id === targetAccountId)
  const isBankTransfer = selectedWallet?.network === 'Bank Transfer'
  const [amount, setAmount] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false)
  const [currentDeposit, setCurrentDeposit] = useState<Deposit | null>(null)

  useEffect(() => {
    if (accounts.length === 0) fetchAccounts().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchWallets()
    fetchDeposits()
  }, [])

  async function fetchWallets() {
    try {
      const data = await api.get<DepositWallet[]>('/deposits/wallets')
      setWallets(data)
    } catch {
      toast.error('Failed to load deposit wallets')
    }
  }

  async function fetchDeposits() {
    try {
      const data = await api.get<DepositListResponse>('/deposits')
      setDeposits(data.deposits)
    } catch (error) {
      console.error('Failed to load deposits:', error)
    }
  }

  async function handleCreateDeposit() {
    if (!selectedWallet) return

    setIsCreatingDeposit(true)
    try {
      const deposit = await api.post<Deposit>('/deposits', {
        currency_id: selectedWallet.currency_id,
        // Names the account to credit; without it a deposit lands on the
        // primary real account regardless of which one the user opened this
        // page from.
        account_id: targetAccountId ?? undefined,
        amount: amount ? parseFloat(amount) : undefined,
      })
      setCurrentDeposit(deposit)
      toast.success('Deposit request created')
      await fetchDeposits()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create deposit')
    } finally {
      setIsCreatingDeposit(false)
    }
  }

  async function handleMarkAsPaid(depositId: string) {
    setIsLoading(true)
    try {
      const updated = await api.post<Deposit>(`/deposits/${depositId}/mark-paid`, {})
      toast.success('Payment marked. Waiting confirmation.')
      await fetchDeposits()
      if (currentDeposit?.id === depositId) {
        setCurrentDeposit(updated)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark deposit as paid')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletChange = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    setSelectedWallet(wallet || null)
    setCopied(false)
    setCurrentDeposit(null)
  }

  const handleCopyAddress = async () => {
    if (selectedWallet?.wallet_address) {
      await navigator.clipboard.writeText(selectedWallet.wallet_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge tone="warning">Pending</Badge>
      case 'user_paid':
        return <Badge tone="neutral">Waiting Confirmation</Badge>
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

  const pendingDeposits = deposits.filter((d) => d.status === 'pending' || d.status === 'user_paid')
  const completedDeposits = deposits.filter((d) => d.status === 'credited' || d.status === 'confirmed')

    const banner = targetAccount ? (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
      <span className="text-sm text-navy-800">Funding</span>
      <span className="font-mono text-sm font-bold text-navy-900">{targetAccount.account_number}</span>
      {targetAccount.label && <span className="text-sm text-slate-500">· {targetAccount.label}</span>}
      <span className="ml-auto text-xs text-slate-500">Credited to this account once confirmed</span>
    </div>
  ) : null

return (
    <div className="mx-auto max-w-4xl space-y-6">
      {banner}
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Add Funds</h1>
        <p className="mt-2 text-slate-600">Refill your account</p>
      </div>

      {/* Current Balance */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Available Balance</p>
            <p className="mt-1 font-display text-3xl font-bold text-navy-900">
              {formatCurrency(wallet?.available_balance ?? 0, wallet?.currency)}
            </p>
          </div>
          <div className="rounded-full bg-accent-50 p-4">
            <svg className="h-8 w-8 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Deposit Form */}
      <Card>
        <CardHeader title="Select Payment Method" />

        <div className="space-y-6">
          {/* Payment Method Dropdown */}
          <div>
            <label className="block text-sm font-medium text-navy-900">
              Payment Method <span className="text-accent-600">*</span>
            </label>
            <select
              value={selectedWallet?.id || ''}
              onChange={(e) => handleWalletChange(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-navy-900 shadow-sm transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            >
              <option value="">Choose a payment method...</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.icon} {wallet.currency_name} ({wallet.currency_symbol}) — Network: {wallet.network} • Fee: {wallet.network_fee}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          {selectedWallet && (
            <div>
              <label className="block text-sm font-medium text-navy-900">
                Amount (Optional)
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Enter the amount you plan to deposit for reference tracking
              </p>
              <input
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`0.00 ${selectedWallet.currency_symbol}`}
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-navy-900 shadow-sm transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
          )}

          {/* Deposit Address Display */}
          {selectedWallet && (
            <div className="space-y-4 rounded-lg border-2 border-accent-100 bg-accent-50/30 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedWallet.icon}</span>
                    <div>
                      <h3 className="font-semibold text-navy-900">{selectedWallet.currency_name}</h3>
                      <p className="text-sm text-slate-600">Network: {selectedWallet.network}</p>
                    </div>
                  </div>
                </div>
                {selectedWallet.is_active && (
                  <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Active
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900">
                  Deposit Address
                </label>
                {/* Wire transfers are arranged with support rather than
                    self-served: bank details vary by corridor and amount, and
                    a wrong reference on a wire is far harder to recover than a
                    mistyped crypto address. */}
                {isBankTransfer ? (
                  <div className="mt-2 rounded-xl border border-accent-200 bg-accent-50 p-5 text-center">
                    <p className="text-sm font-semibold text-navy-900">Contact customer support</p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">
                      Wire and bank transfers are set up individually. Get in touch and our team will send you the
                      correct beneficiary details and payment reference for your region and amount.
                    </p>
                    <a
                      href="mailto:support@vanguardiafinancial.com?subject=Wire%20transfer%20deposit"
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
                    >
                      support@vanguardiafinancial.com
                    </a>
                    <p className="mt-3 text-[11px] text-slate-500">
                      Do not send funds before receiving confirmed details.
                    </p>
                  </div>
                ) : (
                  // QR sits beside the address on desktop and above it on
                  // narrow screens, where scanning from a phone is most likely
                  // to be how it gets used.
                  <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <DepositQrCode
                    address={selectedWallet.wallet_address}
                    currency={selectedWallet.currency_symbol}
                    scannable={selectedWallet.network !== 'Bank Transfer'}
                  />
                  <div className="w-full flex-1">
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-navy-900 shadow-sm break-all">
                    {selectedWallet.wallet_address}
                  </div>
                  <Button onClick={handleCopyAddress} variant="secondary">
                    {copied ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </Button>
                </div>
                {copied && <p className="mt-1 text-xs font-medium text-green-600">✓ Address copied to clipboard</p>}
                {selectedWallet.memo_tag && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-navy-900">Memo/Tag (Required)</label>
                    <div className="mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-navy-900 shadow-sm">
                      {selectedWallet.memo_tag}
                    </div>
                  </div>
                )}
                  </div>
                </div>
                )}
              </div>

              {/* Fee Info */}
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Network Fee: {selectedWallet.network_fee}</p>
                    <p className="mt-1 text-blue-700">
                      This fee is deducted from your deposit amount by the blockchain network.
                    </p>
                    {selectedWallet.minimum_deposit && (
                      <p className="mt-1 font-medium text-blue-900">
                        Minimum Deposit: {selectedWallet.minimum_deposit}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Create Deposit Button */}
              {!currentDeposit && (
                <Button
                  fullWidth
                  onClick={handleCreateDeposit}
                  isLoading={isCreatingDeposit}
                  variant="primary"
                >
                  Create Deposit Request
                </Button>
              )}
            </div>
          )}

          {/* Important Instructions */}
          {selectedWallet && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2">
                <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-900">
                  <p className="font-semibold">Important Instructions:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800">
                    <li>Only send <strong>{selectedWallet.currency_name}</strong> to this address</li>
                    <li>Ensure you are using the <strong>{selectedWallet.network}</strong> network</li>
                    <li>Sending via wrong network will result in permanent loss of funds</li>
                    {selectedWallet.minimum_deposit && <li>Minimum deposit: <strong>{selectedWallet.minimum_deposit}</strong></li>}
                    <li>After sending, click &ldquo;I Paid&rdquo; button below and wait for confirmation.</li>
                    <li>All deposits require confirmation before being credited</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Pending Deposits */}
      <Card>
        <CardHeader title="Pending Deposits" />
        {pendingDeposits.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-900">No pending deposits</p>
            <p className="mt-1 text-xs text-slate-500">Your cryptocurrency deposits will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingDeposits.map((deposit) => (
                  <tr key={deposit.id} className="text-sm">
                    <td className="py-4">
                      <div className="font-semibold text-navy-900">{deposit.currency_symbol}</div>
                    </td>
                    <td className="py-4 text-slate-600">{deposit.network}</td>
                    <td className="py-4 font-semibold tabular-nums text-navy-900">
                      {deposit.amount} {deposit.currency_symbol}
                    </td>
                    <td className="py-4">{getStatusBadge(deposit.status)}</td>
                    <td className="py-4 text-slate-600">
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      {deposit.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleMarkAsPaid(deposit.id)}
                          isLoading={isLoading}
                        >
                          I Paid
                        </Button>
                      ) : deposit.status === 'user_paid' ? (
                        <span className="text-xs font-medium text-blue-600">Waiting Confirmation</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Deposit History */}
      <Card>
        <CardHeader title="Deposit History" />
        {completedDeposits.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-900">No deposit history</p>
            <p className="mt-1 text-xs text-slate-500">Completed deposits will be listed here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Credited</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedDeposits.map((deposit) => (
                  <tr key={deposit.id} className="text-sm">
                    <td className="py-4">
                      <div className="font-semibold text-navy-900">{deposit.currency_symbol}</div>
                    </td>
                    <td className="py-4 text-slate-600">{deposit.network}</td>
                    <td className="py-4 font-semibold tabular-nums text-navy-900">
                      {deposit.amount} {deposit.currency_symbol}
                    </td>
                    <td className="py-4 font-semibold tabular-nums text-gain-600">
                      +{deposit.credited_amount || deposit.amount} {deposit.currency_symbol}
                    </td>
                    <td className="py-4">{getStatusBadge(deposit.status)}</td>
                    <td className="py-4 text-slate-600">
                      {new Date(deposit.admin_confirmed_at || deposit.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader title="Need Help?" />
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-3">
            <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-navy-900">How long do deposits take?</p>
              <p className="mt-1">After you click &ldquo;I Paid&rdquo; your deposit shows as waiting confirmation while we verify it. This typically takes 10&ndash;30 minutes during business hours.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="font-medium text-navy-900">Is my deposit safe?</p>
              <p className="mt-1">All deposit addresses are unique and secured with industry-standard encryption.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div>
              <p className="font-medium text-navy-900">Contact Support</p>
              <p className="mt-1">Having issues? Contact our 24/7 support team at support@vanguardiafinancial.com</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/** `useSearchParams` needs a Suspense boundary under static export. */
export default function AddFundsPage() {
  return (
    <Suspense>
      <AddFundsInner />
    </Suspense>
  )
}
