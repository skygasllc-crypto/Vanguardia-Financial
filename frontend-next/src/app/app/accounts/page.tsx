'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AccountHistory } from '@/components/accounts/AccountHistory'
import { AccountTile } from '@/components/accounts/AccountTile'
import { EquityChart } from '@/components/accounts/EquityChart'
import { WithdrawalPanel } from '@/components/wallet/WithdrawalPanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { PnLText } from '@/components/common/PnLText'
import { Spinner } from '@/components/common/Spinner'
import { useAccountsStore } from '@/store/accountsStore'
import { toast } from '@/store/toastStore'
import type { AccountType, EquityPoint } from '@/types/account'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

const RANGES = [7, 30, 90] as const

export default function AccountsPage() {
  const router = useRouter()
  const accounts = useAccountsStore((s) => s.accounts)
  const isLoading = useAccountsStore((s) => s.isLoading)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)
  const createAccount = useAccountsStore((s) => s.createAccount)
  const renameAccount = useAccountsStore((s) => s.renameAccount)
  const fetchEquityCurve = useAccountsStore((s) => s.fetchEquityCurve)

  const [curve, setCurve] = useState<EquityPoint[]>([])
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [filter, setFilter] = useState<'all' | AccountType>('all')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [newType, setNewType] = useState<AccountType>('demo')
  const [newLabel, setNewLabel] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    fetchAccounts().catch(() => toast.error('Could not load accounts.'))
  }, [fetchAccounts])

  const loadCurve = useCallback(
    (id: string, days: number) => {
      fetchEquityCurve(id, days).then(setCurve).catch(() => setCurve([]))
    },
    [fetchEquityCurve],
  )

  useEffect(() => {
    if (activeAccountId) loadCurve(activeAccountId, range)
  }, [activeAccountId, range, loadCurve])

  const active = accounts.find((a) => a.id === activeAccountId)
  const visible = filter === 'all' ? accounts : accounts.filter((a) => a.account_type === filter)
  const totalEquity = accounts.reduce((sum, a) => sum + Number(a.equity), 0)
  const totalPnl = accounts.reduce((sum, a) => sum + Number(a.total_pnl), 0)

  async function handleCreate() {
    setIsCreating(true)
    try {
      const account = await createAccount({ account_type: newType, label: newLabel.trim() || undefined })
      toast.success(`Opened ${account.account_number}.`)
      setIsOpenModal(false)
      setNewLabel('')
      await fetchAccounts()
      setActiveAccount(account.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the account.')
    } finally {
      setIsCreating(false)
    }
  }

  async function saveRename(id: string) {
    try {
      await renameAccount(id, renameValue.trim())
      toast.success('Account renamed.')
    } catch {
      toast.error('Could not rename the account.')
    } finally {
      setRenaming(null)
    }
  }

  if (isLoading && accounts.length === 0) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Portfolio-wide header: the aggregate across every account, so the
          totals are visible before drilling into any single one. */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Total equity</p>
            <p className="font-display text-4xl font-bold tabular-nums">{formatCurrency(totalEquity)}</p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <PnLText value={String(totalPnl)} size="sm" />
              <span className="text-slate-400">across {accounts.length} account{accounts.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push('/app/wallet/add-funds')}>
              Deposit
            </Button>
            <Button onClick={() => setIsOpenModal(true)}>Open account</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'demo', 'real'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f === 'all' ? 'All accounts' : f}
            <span className="ml-1.5 tabular-nums opacity-60">
              {f === 'all' ? accounts.length : accounts.filter((a) => a.account_type === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((a) => (
          <AccountTile key={a.id} account={a} isActive={a.id === activeAccountId} onSelect={setActiveAccount} />
        ))}
      </div>

      {active && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {renaming === active.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    maxLength={60}
                    placeholder="Account name"
                    className="w-56"
                  />
                  <Button size="sm" onClick={() => saveRename(active.id)}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-navy-900">{active.account_number}</h2>
                  <span className="text-sm text-slate-500">{active.label || 'Unnamed'}</span>
                  <button
                    onClick={() => {
                      setRenaming(active.id)
                      setRenameValue(active.label ?? '')
                    }}
                    className="text-xs font-medium text-accent-600 hover:text-accent-700"
                  >
                    Rename
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Leverage 1:{active.leverage} · {active.currency} · opened{' '}
                {new Date(active.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/app/wallet/add-funds?account=${active.id}`)}
              >
                Deposit to this account
              </Button>
              <Button size="sm" onClick={() => router.push('/app/trade')}>Trade on this account</Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-7">
            <Stat label="Balance" value={formatCurrency(active.balance, active.currency)} />
            <Stat label="Credits" value={formatCurrency(active.bonus, active.currency)} />
            <Stat
              label="On hold"
              value={formatCurrency(active.held, active.currency)}
              hint={Number(active.held) > 0 ? 'pending withdrawal' : undefined}
            />
            <Stat label="Withdrawable" value={formatCurrency(active.withdrawable, active.currency)} />
            <Stat label="Margin used" value={formatCurrency(active.margin_used, active.currency)} />
            <Stat label="Free margin" value={formatCurrency(active.free_margin, active.currency)} />
            <Stat
              label="Margin level"
              value={active.margin_level === null ? '—' : `${Number(active.margin_level).toFixed(0)}%`}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-900">Progress</h3>
            <div className="flex gap-1">
              {RANGES.map((d) => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                    range === d ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <EquityChart points={curve} />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <WithdrawalPanel account={active} />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <AccountHistory account={active} />
          </div>
        </div>
      )}

      <Modal
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        title="Open a new account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpenModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={isCreating}>Open account</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-sm font-medium text-navy-800">Account type</span>
            <div className="grid grid-cols-2 gap-2">
              {(['demo', 'real'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left transition-colors',
                    newType === t ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span className="block text-sm font-semibold capitalize text-navy-900">{t}</span>
                  <span className="block text-xs text-slate-500">
                    {t === 'demo' ? 'Practice account, opens at $0' : 'Funded by deposit'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Name (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Swing trading"
            maxLength={60}
          />
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-navy-900">{value}</p>
      {hint && <p className="truncate text-[10px] text-amber-600">{hint}</p>}
    </div>
  )
}
