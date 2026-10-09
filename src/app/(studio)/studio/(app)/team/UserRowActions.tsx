'use client'

import Link from 'next/link'
import { useTransition } from 'react'

import { deleteUser } from '@/app/actions/studio-users'

export function UserRowActions({ id, isSelf }: { id: number; isSelf: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
        href={`/studio/team/${id}`}
      >
        Edit
      </Link>
      {!isSelf && (
        <button
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            if (confirm('Delete this user? They will lose access immediately.')) {
              startTransition(() => deleteUser(id))
            }
          }}
          type="button"
        >
          Delete
        </button>
      )}
    </div>
  )
}
