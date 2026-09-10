'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { securityService } from '@/lib/securityService'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import type { LoginHistoryEntry, Session } from '@/types/security'
import { formatDateTime } from '@/lib/format'

export default function SecurityPage() {
  const user = useAuthStore((s) => s.user)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  useEffect(() => {
    securityService.listSessions().then(setSessions).catch(() => undefined)
    securityService.loginHistory().then(setLoginHistory).catch(() => undefined)
  }, [])

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setIsChangingPassword(true)
    try {
      await securityService.changePassword(passwordForm.current, passwordForm.next)
      toast.success('Password updated successfully.')
      setPasswordForm({ current: '', next: '' })
    } catch {
      toast.error('Could not update password. Check your current password and try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function startTwoFactorSetup() {
    try {
      const setup = await securityService.setupTwoFactor()
      setTwoFactorSetup(setup)
    } catch {
      toast.error('Could not start two-factor setup.')
    }
  }

  async function verifyTwoFactor() {
    try {
      await securityService.verifyTwoFactor(twoFactorCode)
      toast.success('Two-factor authentication enabled.')
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      fetchCurrentUser().catch(() => undefined)
    } catch {
      toast.error('Invalid verification code.')
    }
  }

  async function disableTwoFactor() {
    try {
      await securityService.disableTwoFactor()
      toast.success('Two-factor authentication disabled.')
      fetchCurrentUser().catch(() => undefined)
    } catch {
      toast.error('Could not disable two-factor authentication.')
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      await securityService.revokeSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Session revoked.')
    } catch {
      toast.error('Could not revoke session.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Change Password" />
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <Input
              label="Current Password"
              type="password"
              required
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
            />
            <Input
              label="New Password"
              type="password"
              required
              minLength={8}
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
            />
            <Button type="submit" isLoading={isChangingPassword}>Update Password</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Two-Factor Authentication" action={<Badge tone={user?.two_factor_enabled ? 'gain' : 'neutral'}>{user?.two_factor_enabled ? 'Enabled' : 'Disabled'}</Badge>} />
          {user?.two_factor_enabled ? (
            <div>
              <p className="text-sm text-slate-500">Two-factor authentication is protecting your account.</p>
              <Button variant="danger" size="sm" className="mt-4" onClick={disableTwoFactor}>Disable 2FA</Button>
            </div>
          ) : twoFactorSetup ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Scan this into your authenticator app, then enter the 6-digit code to confirm.</p>
              <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-navy-800">{twoFactorSetup.secret}</p>
              <Input label="Verification Code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} maxLength={6} />
              <Button onClick={verifyTwoFactor}>Verify & Enable</Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500">Add an extra layer of security using a TOTP authenticator app.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={startTwoFactorSetup}>Set Up 2FA</Button>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Active Sessions & Devices" subtitle="Sessions currently signed in to your account." />
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions" />
        ) : (
          <div className="divide-y divide-slate-50">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{s.device_name ?? s.user_agent ?? 'Unknown device'}</p>
                  <p className="text-xs text-slate-500">
                    {s.ip_address ?? 'Unknown IP'} · Last active {s.last_active_at ? formatDateTime(s.last_active_at) : '—'}
                  </p>
                </div>
                <Button size="sm" variant="danger" onClick={() => revokeSession(s.id)}>Revoke</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Login History" subtitle="Recent sign-in attempts, successful and failed." />
        {loginHistory.length === 0 ? (
          <EmptyState title="No login history yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Status</th>
                  <th className="pb-2">IP Address</th>
                  <th className="pb-2">Device</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">
                      <Badge tone={entry.success ? 'gain' : 'loss'}>{entry.success ? 'Success' : entry.failure_reason ?? 'Failed'}</Badge>
                      {entry.is_suspicious && <Badge tone="warning" className="ml-2">Suspicious</Badge>}
                    </td>
                    <td className="py-2.5 text-slate-600">{entry.ip_address ?? '—'}</td>
                    <td className="py-2.5 text-slate-500">{entry.user_agent ?? '—'}</td>
                    <td className="py-2.5 text-slate-400">{formatDateTime(entry.created_at)}</td>
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
