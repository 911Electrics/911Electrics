'use client'

import { useState, useTransition } from 'react'

import { restorePostRevision } from '@/app/actions/studio-posts'
import { timeAgo } from '@/studio/constants'
import type { PostRevision } from '@/studio/posts'

export function Revisions({ postId, revisions }: { postId: number; revisions: PostRevision[] }) {
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (revisions.length === 0) {
    return <p className="text-sm text-slate-400">No revisions yet — they’re saved each time you save the post.</p>
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
    <ul className="divide-y divide-slate-100">
      {revisions.map((r, i) => (
        <li className="flex items-center justify-between gap-3 py-2.5" key={r.id}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800">
              {r.note ?? 'Saved'}
              {i === 0 && <span className="ml-2 text-xs font-normal text-slate-400">(current)</span>}
            </div>
            <div className="text-xs text-slate-400">
              {r.authorName ?? 'Someone'} · {timeAgo(r.createdAt)}
              {r.status ? ` · ${r.status}` : ''}
            </div>
          </div>
          {i !== 0 && (
            <button
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={pending}
              onClick={() => {
                if (!window.confirm('Restore this version? The current content will be replaced (and saved as a new revision).')) return
                setBusy(r.id)
                setError(null)
                start(async () => {
                  try {
                    await restorePostRevision(postId, r.id)
                    // Full reload so the editor re-initializes with restored content.
                    window.location.reload()
                  } catch {
                    setBusy(null)
                    setError('Could not restore that version. Please try again.')
                  }
                })
              }}
              type="button"
            >
              {busy === r.id ? 'Restoring…' : 'Restore'}
            </button>
          )}
        </li>
      ))}
    </ul>
    </>
  )
}
