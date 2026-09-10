'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { UserStatusControls } from '@/components/admin/UserStatusControls'
import type { UserStatus } from '@/types/user'
import { Spinner } from '@/components/common/Spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { adminService } from '@/lib/adminService'
import type { AdminUserRow } from '@/types/admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from '@/store/toastStore'

type SortKey = 'full_name' | 'total_account_value' | 'total_trading_volume' | 'created_at'

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    adminService
      .listUsers(debouncedSearch, page, PAGE_SIZE)
      .then((res) => {
        setRows(res.items)
        setTotal(res.total)
      })
      .finally(() => setIsLoading(false))
  }, [debouncedSearch, page])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sortDesc ? -cmp : cmp
    })
    return copy
  }, [rows, sortKey, sortDesc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((v) => !v)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  async function activateUser(userId: string) {
    try {
      // Update both status and verification
      await Promise.all([
        adminService.updateUserStatus(userId, 'active'),
        adminService.updateUserVerification(userId, true)
      ])
      toast.success('User activated and verified successfully')
      // Reload users list
      const res = await adminService.listUsers(debouncedSearch, page, PAGE_SIZE)
      setRows(res.items)
      setTotal(res.total)
    } catch (error) {
      toast.error('Failed to activate user')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by name, email, or username…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-80"
        />
        <Button variant="secondary" size="sm">Export Users (CSV)</Button>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <Th label="User" onClick={() => toggleSort('full_name')} active={sortKey === 'full_name'} desc={sortDesc} />
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification</th>
                <Th label="Account Value" onClick={() => toggleSort('total_account_value')} active={sortKey === 'total_account_value'} desc={sortDesc} />
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Realized P&L</th>
                <th className="px-4 py-3">Unrealized P&L</th>
                <Th label="Volume" onClick={() => toggleSort('total_trading_volume')} active={sortKey === 'total_trading_volume'} desc={sortDesc} />
                <th className="px-4 py-3">Positions</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Risk</th>
                <Th label="Registered" onClick={() => toggleSort('created_at')} active={sortKey === 'created_at'} desc={sortDesc} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-sm text-slate-400">No users found.</td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email} · @{u.username}</p>
                    </td>
                    <td className="px-4 py-3"><Badge tone={statusTone(u.status)} className="capitalize">{u.status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={u.is_verified ? 'gain' : 'warning'}>{u.is_verified ? 'Verified' : 'Pending'}</Badge></td>
                    <td className="px-4 py-3 tabular-nums font-medium text-navy-900">{formatCurrency(u.total_account_value, u.currency)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{formatCurrency(u.available_balance, u.currency)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{formatCurrency(u.total_realized_pnl, u.currency)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{formatCurrency(u.total_unrealized_pnl, u.currency)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{formatCurrency(u.total_trading_volume, u.currency)}</td>
                    <td className="px-4 py-3 text-slate-600">{u.open_positions_count}</td>
                    <td className="px-4 py-3 text-slate-600">{u.open_orders_count}</td>
                    <td className="px-4 py-3"><Badge tone={u.risk_status === 'normal' ? 'neutral' : u.risk_status === 'watch' ? 'warning' : 'loss'} className="capitalize">{u.risk_status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === 'pending_verification' ? (
                          <Button size="sm" variant="primary" onClick={() => activateUser(u.id)}>
                            Activate
                          </Button>
                        ) : (
                          <UserStatusControls
                            userId={u.id}
                            status={u.status}
                            onChanged={(next) =>
                              setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, status: next } : r)))
                            }
                            onDeleted={() => setRows((prev) => prev.filter((r) => r.id !== u.id))}
                          />
                        )}
                        <Link href={`/admin/users/detail?userId=${u.id}`}>
                          <Button size="sm" variant="secondary">Manage</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {page} of {totalPages} · {total} users
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Th({ label, onClick, active, desc }: { label: string; onClick: () => void; active: boolean; desc: boolean }) {
  return (
    <th className="px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-navy-700">
        {label}
        {active && <span>{desc ? '↓' : '↑'}</span>}
      </button>
    </th>
  )
}

/** Banned reads as a failure, the reversible holds as a warning, active as a
 * gain — so a scan down the column separates "off" from "gone". */
function statusTone(status: UserStatus): 'gain' | 'warning' | 'loss' | 'neutral' {
  if (status === 'active') return 'gain'
  if (status === 'banned') return 'loss'
  if (status === 'suspended' || status === 'deactivated') return 'warning'
  return 'neutral'
}
