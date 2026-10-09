'use client'

import { useTransition } from 'react'

import { revokeMyOtherSessions, revokeMySession } from '@/app/actions/sessions'
import { timeAgo } from '@/studio/constants'
import type { SessionRow } from '@/studio/sessions'

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [pending, start] = useTransition()
  const hasOthers = sessions.some((s) => !s.current)

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {sessions.map((s) => (
          <li className="flex items-center justify-between gap-3 px-4 py-3" key={s.id}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                {s.device}
                {s.current && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    This device
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {s.ip ? `${s.ip} · ` : ''}active {timeAgo(s.lastSeenAt)}
              </div>
            </div>
            {!s.current && (
              <button
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
                disabled={pending}
                onClick={() => start(async () => revokeMySession(s.id))}
                type="button"
              >
                Sign out
              </button>
            )}
          </li>
        ))}
      </ul>
      {hasOthers && (
        <button
          className="text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => revokeMyOtherSessions())}
          type="button"
        >
          Sign out all other devices
        </button>
      )}
    </div>
  )
}
