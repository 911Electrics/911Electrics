import { redirect } from 'next/navigation'

import { getAuditLog } from '@/studio/audit'
import { getStudioUser } from '@/studio/auth'
import { timeAgo } from '@/studio/constants'

export const dynamic = 'force-dynamic'

const ACTION_LABEL: Record<string, string> = {
  'user.create': 'Created user',
  'user.update': 'Updated user',
  'user.delete': 'Deleted user',
  'user.password': 'Set user password',
  'user.password.self': 'Changed own password',
  'settings.update': 'Updated business info',
  'post.delete': 'Deleted blog post',
  'service.delete': 'Deleted service',
  'city.delete': 'Deleted service area',
  'review.delete': 'Deleted review',
  'apikey.create': 'Created API key',
  'apikey.revoke': 'Revoked API key',
}

export default async function AuditPage() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')

  const entries = await getAuditLog()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recent administrative changes — who did what, and when. Last {entries.length} events.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          No activity recorded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {entries.map((e) => (
              <li className="flex items-start gap-3 px-5 py-3 text-sm" key={e.id}>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  {e.summary && <span className="text-slate-600"> — {e.summary}</span>}
                  <div className="text-xs text-slate-400">
                    {e.userEmail ?? 'system'}
                    {e.targetType ? ` · ${e.targetType}${e.targetId ? ` #${e.targetId}` : ''}` : ''}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
