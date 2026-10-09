import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getStudioUser } from '@/studio/auth'
import { STUDIO_PERMISSION_LABEL, STUDIO_ROLE_LABEL, timeAgo } from '@/studio/constants'
import { getUsers } from '@/studio/users'

import { UserRowActions } from './UserRowActions'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')

  const users = await getUsers()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} user{users.length === 1 ? '' : 's'}. Admins manage the team & business
            settings; editors manage content.
          </p>
        </div>
        <Link
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          href="/studio/team/new"
        >
          Add user
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li className="flex items-center gap-3 px-5 py-3.5" key={u.id}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {u.name || u.email}
                  {u.id === me.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  {u.disabled && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Disabled
                    </span>
                  )}
                  {u.totpEnabled && (
                    <span
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                      title="Two-factor authentication enabled"
                    >
                      2FA
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {u.email} ·{' '}
                  {u.lastLoginAt ? `last login ${timeAgo(u.lastLoginAt)}` : 'never signed in'}
                </div>
                {u.role === 'editor' && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.permissions.length === 0 ? (
                      <span className="text-xs text-slate-400">No sections assigned</span>
                    ) : (
                      u.permissions.map((p) => (
                        <span
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                          key={p}
                        >
                          {STUDIO_PERMISSION_LABEL[p]}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                }`}
                title={STUDIO_ROLE_LABEL[u.role]}
              >
                {u.role === 'admin' ? 'Admin' : 'Editor'}
              </span>
              <UserRowActions id={u.id} isSelf={u.id === me.id} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
