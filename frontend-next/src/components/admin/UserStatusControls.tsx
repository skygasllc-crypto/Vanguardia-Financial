'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { adminService } from '@/lib/adminService'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/cn'
import type { UserStatus } from '@/types/user'

/** The blocking actions an admin can take, and what each one means.
 *
 * All three deny sign-in identically — they differ in intent and in the record
 * they leave, which is what makes a later review possible. Reinstating is kept
 * separate because it is the only one that does not need a justification. */
const ACTIONS: {
  status: Exclude<UserStatus, 'pending_verification' | 'active'>
  label: string
  verb: string
  /** One line, shown under the item in the dropdown. */
  summary: string
  /** The fuller wording, shown in the confirmation dialog. */
  description: string
  variant: 'secondary' | 'danger'
}[] = [
  {
    status: 'suspended',
    label: 'Suspend',
    verb: 'Suspend',
    summary: 'Temporary hold — expected to be lifted.',
    description: 'Temporary hold. Sign-in is refused and live sessions end, but the account is expected to come back.',
    variant: 'secondary',
  },
  {
    status: 'deactivated',
    label: 'Deactivate',
    verb: 'Deactivate',
    summary: 'Dormant or closed. Reversible any time.',
    description: 'Account goes dormant — closed or shelved rather than punished. Reversible at any time.',
    variant: 'secondary',
  },
  {
    status: 'banned',
    label: 'Block',
    verb: 'Block',
    summary: 'Punitive, intended to be permanent.',
    description: 'Punitive and intended to be permanent. Use when the account should not return.',
    variant: 'danger',
  },
]

interface UserStatusControlsProps {
  userId: string
  status: UserStatus
  /** Called after a successful change so the caller can refresh its rows. */
  onChanged: (next: UserStatus) => void
  size?: 'sm' | 'md'
}

export function UserStatusControls({ userId, status, onChanged, size = 'sm' }: UserStatusControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, setPending] = useState<(typeof ACTIONS)[number] | null>(null)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isBlocked = status === 'suspended' || status === 'deactivated' || status === 'banned'

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  async function apply(next: UserStatus, why?: string) {
    setIsSaving(true)
    try {
      const res = await adminService.updateUserStatus(userId, next, why)
      const revoked = res.sessions_revoked
      toast.success(
        revoked > 0
          ? `Account ${next}. ${revoked} active ${revoked === 1 ? 'session' : 'sessions'} revoked.`
          : `Account ${next}.`,
      )
      onChanged(next)
      setPending(null)
      setReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the account status.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isBlocked ? (
          <Button size={size} variant="primary" isLoading={isSaving} onClick={() => apply('active')}>
            Reactivate
          </Button>
        ) : (
          <div className="relative">
            <Button size={size} variant="secondary" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
              Restrict
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1.5 inline-block" aria-hidden>
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>

            {menuOpen && (
              <>
                {/* Full-screen catcher closes the menu on any outside click,
                    the same pattern the topbar account menu uses. */}
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-[var(--shadow-card-lg)]"
                >
                  {ACTIONS.map((a) => (
                    <button
                      key={a.status}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setPending(a)
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className={cn('block text-sm font-medium', a.variant === 'danger' ? 'text-loss-600' : 'text-navy-800')}>
                        {a.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">{a.summary}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={pending !== null}
        onClose={() => {
          setPending(null)
          setReason('')
        }}
        title={`${pending?.verb ?? ''} this account?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPending(null)
                setReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant={pending?.variant === 'danger' ? 'danger' : 'primary'}
              isLoading={isSaving}
              // The server rejects a blocking change with no reason; mirroring
              // that here means the admin is told before the round trip.
              disabled={reason.trim().length === 0}
              onClick={() => pending && apply(pending.status, reason.trim())}
            >
              {pending?.verb}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{pending?.description}</p>
          <p className="text-sm text-slate-600">
            The user is signed out immediately and cannot sign in again until an admin reinstates the account.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-navy-800">
              Reason <span className="font-normal text-slate-500">(recorded in the audit log)</span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why is this account being actioned?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none"
            />
          </label>
        </div>
      </Modal>
    </>
  )
}
