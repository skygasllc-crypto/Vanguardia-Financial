'use client'

import { type FormEvent, type ReactNode, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardHeader } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { api } from '@/lib/apiClient'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { toast } from '@/store/toastStore'
import type { User } from '@/types/user'
import { formatDate } from '@/lib/format'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [notifyTrade, setNotifyTrade] = useState(true)
  const [notifySecurity, setNotifySecurity] = useState(true)

  if (!user) return null

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.patch<User>('/users/me', {
        full_name: fullName,
        notification_preferences: { trade: notifyTrade, security: notifySecurity },
      })
      await fetchCurrentUser()
      toast.success('Profile updated.')
    } catch {
      toast.error('Could not update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal Information" />
          <form className="space-y-4" onSubmit={handleSave}>
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Email" value={user.email} disabled hint="Contact support to change your email address." />
            <Input label="Username" value={user.username} disabled />
            <Button type="submit" isLoading={isSaving}>Save Changes</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Account Status" />
          <div className="space-y-3 text-sm">
            <Row label="Email Verification" value={<Badge tone={user.is_verified ? 'gain' : 'warning'}>{user.is_verified ? 'Verified' : 'Pending'}</Badge>} />
            <Row label="Account Status" value={<Badge tone="accent" className="capitalize">{user.status.replace(/_/g, ' ')}</Badge>} />
            <Row label="Member Since" value={<span className="text-navy-800">{formatDate(user.created_at)}</span>} />
            <Row label="Last Login" value={<span className="text-navy-800">{user.last_login_at ? formatDate(user.last_login_at) : '—'}</span>} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Notification Preferences" />
        <div className="space-y-3">
          <Toggle label="Trade & order notifications" checked={notifyTrade} onChange={setNotifyTrade} />
          <Toggle label="Security & login alerts" checked={notifySecurity} onChange={setNotifySecurity} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Theme Preference" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Choose how Vanguardia Financial looks on your device.</p>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${theme === 'light' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
            >
              Light
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${theme === 'dark' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
            >
              Dark
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
      <span className="text-slate-500">{label}</span>
      {value}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm text-navy-800">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-navy-900' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}
