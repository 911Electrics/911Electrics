import { Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { PostSummary } from '@/lib/posts'
import { formatDateTime } from '@/utilities/formatDateTime'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      href={`/${post.slug}/`}
    >
      <div className="relative">
        {post.heroImage?.url ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-card">
            <Image
              alt={post.heroImage.alt || post.title}
              className="object-cover transition duration-300 group-hover:scale-105"
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              src={post.heroImage.url}
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-brand-700 to-navy-900" />
        )}
        {post.categoryTitle && (
          <span className="absolute top-3 left-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
            {post.categoryTitle}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
          )}
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Clock aria-hidden className="size-3" />
            {post.readingMinutes} min read
          </span>
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold break-words text-navy-950 group-hover:text-brand-700">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed break-words text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <span className="mt-auto pt-4 text-sm font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">
          Read article →
        </span>
      </div>
    </Link>
  )
}

/** Large horizontal card for the newest post at the top of the blog index. */
export function FeaturedPostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      className="group grid overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-lg md:grid-cols-2"
      href={`/${post.slug}/`}
    >
      <div className="relative">
        {post.heroImage?.url ? (
          <div className="relative aspect-[16/9] h-full overflow-hidden bg-card md:aspect-auto md:min-h-72">
            <Image
              alt={post.heroImage.alt || post.title}
              className="object-cover transition duration-300 group-hover:scale-105"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              src={post.heroImage.url}
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-brand-700 to-navy-900 md:min-h-72" />
        )}
        {post.categoryTitle && (
          <span className="absolute top-3 left-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
            {post.categoryTitle}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center p-7">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
          )}
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Clock aria-hidden className="size-3" />
            {post.readingMinutes} min read
          </span>
        </p>
        <h2 className="mt-2 text-2xl font-bold text-balance break-words text-navy-950 group-hover:text-brand-700 md:text-3xl">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-3 line-clamp-3 break-words text-muted-foreground">{post.excerpt}</p>
        )}
        <span className="mt-5 text-sm font-semibold text-brand-700">Read article →</span>
      </div>
    </Link>
  )
}
