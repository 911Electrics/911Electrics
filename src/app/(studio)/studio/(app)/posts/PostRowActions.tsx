'use client'

import Link from 'next/link'
import { useTransition } from 'react'

import { deletePost } from '@/app/actions/studio-posts'

export function PostRowActions({ id, slug }: { id: number; slug: string | null }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
        href={`/studio/posts/${id}`}
      >
        Edit
      </Link>
      <button
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this post? This cannot be undone.')) {
            startTransition(() => deletePost(id, slug ?? ''))
          }
        }}
        type="button"
      >
        Delete
      </button>
    </div>
  )
}
