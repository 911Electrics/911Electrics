import Link from 'next/link'

import { createPost } from '@/app/actions/studio-posts'
import { getAllMedia } from '@/studio/media'
import { getStudioCategories } from '@/studio/posts'

import { PostForm } from '../PostForm'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const [mediaItems, categories] = await Promise.all([getAllMedia(), getStudioCategories()])

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        href="/studio/posts"
      >
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to posts
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      </header>
      <PostForm action={createPost} categories={categories} mediaItems={mediaItems} submitLabel="Create post" />
    </div>
  )
}
