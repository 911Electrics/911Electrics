import Link from 'next/link'

import { getAllPosts } from '@/studio/posts'

import { PostsList } from './PostsList'

export const dynamic = 'force-dynamic'

export default async function StudioPostsPage() {
  const posts = await getAllPosts()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-sm text-slate-500">{posts.length} post{posts.length === 1 ? '' : 's'}.</p>
        </div>
        <Link
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          href="/studio/posts/new"
        >
          New post
        </Link>
      </header>

      <PostsList posts={posts} />
    </div>
  )
}
