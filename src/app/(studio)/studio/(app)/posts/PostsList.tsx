'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { PostListItem } from '@/studio/posts'

import { PostRowActions } from './PostRowActions'

export function PostsList({ posts }: { posts: PostListItem[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return posts
    return posts.filter(
      (p) => p.title.toLowerCase().includes(term) || (p.slug ?? '').toLowerCase().includes(term),
    )
  }, [posts, q])

  return (
    <div className="space-y-3">
      {posts.length > 8 && (
        <input
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts…"
          type="search"
          value={q}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          {q ? `No posts match “${q}”.` : 'No posts yet. Write your first one.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li className="flex items-center gap-3 px-5 py-3.5" key={p.id}>
                <Link className="min-w-0 flex-1" href={`/studio/posts/${p.id}`}>
                  <div className="truncate text-sm font-medium text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-500">
                    {p.slug ? `/${p.slug}` : 'no slug'}
                    {p.status === 'scheduled' && p.scheduledFor
                      ? ` · publishes ${new Date(p.scheduledFor).toLocaleString('en-US', { timeZone: 'UTC' })}`
                      : p.publishedAt
                        ? ` · ${new Date(p.publishedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}`
                        : ''}
                  </div>
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : p.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {p.status === 'published' ? 'Published' : p.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                </span>
                <PostRowActions id={p.id} slug={p.slug} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
