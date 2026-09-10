'use client'

import { useState } from 'react'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'

const FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'total_account_balance', label: 'Total Account Balance' },
  { key: 'available_balance', label: 'Available Balance' },
  { key: 'portfolio_value', label: 'Portfolio Value' },
  { key: 'total_profit', label: 'Total Profit' },
  { key: 'total_loss', label: 'Total Loss' },
  { key: 'net_profit_loss', label: 'Net Profit/Loss' },
  { key: 'total_invested_amount', label: 'Total Invested Amount' },
  { key: 'daily_profit_loss', label: 'Daily Profit/Loss' },
  { key: 'profit_loss_percentage', label: 'Overall P&L %' },
]

interface FormState {
  total_account_balance: string
  available_balance: string
  portfolio_value: string
  total_profit: string
  total_loss: string
  net_profit_loss: string
  total_invested_amount: string
  daily_profit_loss: string
  profit_loss_percentage: string
}

const EMPTY: FormState = {
  total_account_balance: '0', available_balance: '0', portfolio_value: '0', total_profit: '0',
  total_loss: '0', net_profit_loss: '0', total_invested_amount: '0', daily_profit_loss: '0', profit_loss_percentage: '0',
}

export function FinancialSettingsForm({ userId, currency, onSaved }: { userId: string; currency: string; onSaved: () => void }) {
  const [isActive, setIsActive] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isSaving, setIsSaving] = useState(false)

  function update(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await adminService.setFinancialSettings(userId, {
        is_active: isActive,
        currency,
        total_account_balance: Number(form.total_account_balance),
        available_balance: Number(form.available_balance),
        portfolio_value: Number(form.portfolio_value),
        total_profit: Number(form.total_profit),
        total_loss: Number(form.total_loss),
        net_profit_loss: Number(form.net_profit_loss),
        total_invested_amount: Number(form.total_invested_amount),
        daily_profit_loss: Number(form.daily_profit_loss),
        profit_loss_percentage: Number(form.profit_loss_percentage),
      })
      toast.success('Financial settings updated. The user dashboard will refresh live.')
      onSaved()
    } catch {
      toast.error('Could not update financial settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm">
        <span className="font-medium text-amber-800">Override this user's dashboard with admin-managed values</span>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Input key={f.key} label={f.label} type="number" step="any" value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} />
        ))}
      </div>

      <p className="text-xs text-slate-500">
        When active, these values replace ledger-computed figures on the user's dashboard and are labeled "Admin-managed" for
        transparency.
      </p>

      <Button fullWidth onClick={handleSave} isLoading={isSaving}>Save Account Override</Button>
    </div>
  )
}
