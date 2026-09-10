'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import type { AdminPosition, AdminUserRow } from '@/types/admin'
import type { PositionStatus } from '@/types/trading'

interface FormState {
  user_id: string
  asset_name: string
  symbol: string
  quantity: string
  entry_price: string
  admin_current_price: string
  invested_amount: string
  admin_current_value: string
  admin_profit_loss: string
  admin_profit_loss_pct: string
  position_status: PositionStatus
}

function toFormState(p?: AdminPosition): FormState {
  if (!p) {
    return {
      user_id: '', asset_name: '', symbol: '', quantity: '', entry_price: '', admin_current_price: '',
      invested_amount: '', admin_current_value: '', admin_profit_loss: '', admin_profit_loss_pct: '', position_status: 'open',
    }
  }
  return {
    user_id: p.user_id, asset_name: p.asset_name, symbol: p.symbol, quantity: p.quantity, entry_price: p.entry_price,
    admin_current_price: p.admin_current_price, invested_amount: p.invested_amount, admin_current_value: p.admin_current_value,
    admin_profit_loss: p.admin_profit_loss, admin_profit_loss_pct: p.admin_profit_loss_pct, position_status: p.position_status,
  }
}

export function AdminPositionForm({ existing, onSaved }: { existing?: AdminPosition; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(toFormState(existing))
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!existing) adminService.listUsers('', 1, 100).then((res) => setUsers(res.items)).catch(() => undefined)
  }, [existing])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.user_id || !form.symbol || !form.quantity || !form.entry_price) {
      toast.error('User, symbol, quantity, and entry price are required.')
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        user_id: form.user_id,
        asset_name: form.asset_name || form.symbol,
        symbol: form.symbol.toUpperCase(),
        quantity: Number(form.quantity),
        entry_price: Number(form.entry_price),
        admin_current_price: Number(form.admin_current_price || form.entry_price),
        invested_amount: Number(form.invested_amount || Number(form.quantity) * Number(form.entry_price)),
        admin_current_value: Number(form.admin_current_value || Number(form.quantity) * Number(form.admin_current_price || form.entry_price)),
        admin_profit_loss: Number(form.admin_profit_loss || 0),
        admin_profit_loss_pct: Number(form.admin_profit_loss_pct || 0),
        position_status: form.position_status,
      }
      if (existing) await adminService.updateAdminPosition(existing.id, payload)
      else await adminService.createAdminPosition(payload)
      toast.success('Position saved. The user\'s dashboard will update live.')
      onSaved()
    } catch {
      toast.error('Could not save position.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {!existing && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-800">User</label>
          <select
            value={form.user_id}
            onChange={(e) => update('user_id', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Asset Name" value={form.asset_name} onChange={(e) => update('asset_name', e.target.value)} placeholder="Bitcoin" />
        <Input label="Symbol" value={form.symbol} onChange={(e) => update('symbol', e.target.value)} placeholder="BTC" />
        <Input label="Quantity" type="number" step="any" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
        <Input label="Entry Price" type="number" step="any" value={form.entry_price} onChange={(e) => update('entry_price', e.target.value)} />
        <Input label="Current Price" type="number" step="any" value={form.admin_current_price} onChange={(e) => update('admin_current_price', e.target.value)} />
        <Input label="Invested Amount" type="number" step="any" value={form.invested_amount} onChange={(e) => update('invested_amount', e.target.value)} />
        <Input label="Current Value" type="number" step="any" value={form.admin_current_value} onChange={(e) => update('admin_current_value', e.target.value)} />
        <Input label="Profit/Loss" type="number" step="any" value={form.admin_profit_loss} onChange={(e) => update('admin_profit_loss', e.target.value)} />
        <Input label="P&L %" type="number" step="any" value={form.admin_profit_loss_pct} onChange={(e) => update('admin_profit_loss_pct', e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-800">Status</label>
          <select
            value={form.position_status}
            onChange={(e) => update('position_status', e.target.value as PositionStatus)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <Button fullWidth onClick={handleSubmit} isLoading={isSaving}>
        {existing ? 'Save Changes' : 'Add Position'}
      </Button>
    </div>
  )
}
