'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { Spinner } from '@/components/common/Spinner'
import { adminService } from '@/lib/adminService'
import { formatDateTime } from '@/lib/format'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    adminService.listAuditLogs().then(setLogs).catch(() => setLogs([]))
  }, [])

  if (!logs) return <Spinner />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-navy-900">System Audit Logs</h1>
        <p className="text-sm text-slate-500">A complete, append-only record of sensitive account and admin actions.</p>
      </div>

      <Card padded={false}>
        {logs.length === 0 ? (
          <EmptyState title="No audit log entries yet" className="m-6" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={String(log.id)} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3"><Badge tone="accent">{String(log.action)}</Badge></td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{String(log.actor_type)}</td>
                    <td className="px-4 py-3 text-slate-600">{String(log.resource_type)}</td>
                    <td className="px-4 py-3 text-slate-500">{log.reason ? String(log.reason) : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(String(log.created_at))}</td>
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
