import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { SiteSettings } from '@/db/types'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PostCard } from '@/components/PostCard'
import RichText from '@/components/RichText'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { ShareButtons } from '@/components/blog/ShareButtons'
import { SidebarCTA, SidebarRecentPosts } from '@/components/blog/Sidebar'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { CTABanner } from '@/components/sections/CTABanner'
import { JsonLd } from '@/components/seo/JsonLd'
import { extractHeadings, readingTime } from '@/lib/blog'
import { getAdjacentPost, getRelatedPosts, type PostDetail } from '@/lib/posts'
import {
  blogPostingSchema,
  breadcrumbSchema,
  electricianSchema,
  jsonLdGraph,
} from '@/lib/schema-org'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getServerSideURL } from '@/utilities/getURL'

const DAY_MS = 24 * 60 * 60 * 1000

export async function BlogPostPage({
  post,
  siteSettings,
}: {
  post: PostDetail
  siteSettings: SiteSettings
}) {
  const [relatedPosts, olderPost, newerPost] = await Promise.all([
    getRelatedPosts(
      post.id,
      post.categories.map((c) => c.id),
    ),
    getAdjacentPost(post.publishedAt, post.id, 'older'),
    getAdjacentPost(post.publishedAt, post.id, 'newer'),
  ])

  const headings = extractHeadings(post.content)
  const minutes = readingTime(post.content)
  const shareUrl = `${getServerSideURL()}/${post.slug}/`
  const showUpdated =
    post.publishedAt &&
    post.updatedAt &&
    new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > DAY_MS

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog/' },
    { name: post.title, path: `/${post.slug}/` },
  ]
  // `BlogPosting.publisher` points at the business by @id, so the business node
  // has to be in the same graph — without it the reference dangles and the
  // article carries no publisher (name, logo, address) at all.
  const json = jsonLdGraph(
    electricianSchema(siteSettings),
    blogPostingSchema(post, siteSettings),
    breadcrumbSchema(breadcrumbs),
  )

  return (
    <article>
      <JsonLd json={json} />
      <ReadingProgress />

      <header className="bg-navy-950 pb-14 text-white">
        <Breadcrumbs dark items={breadcrumbs} />
        <div className="container mt-8 max-w-4xl">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            {post.categories.map((c) => c.title).join(' · ') || 'Blog'}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-balance md:text-5xl">{post.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
            )}
            {showUpdated && post.updatedAt && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Updated <time dateTime={post.updatedAt}>{formatDateTime(post.updatedAt)}</time>
                </span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {minutes} min read
            </span>
          </p>
        </div>
      </header>

      {post.heroImage?.url && (
        <div className="container max-w-4xl">
          <div className="relative -mt-8 aspect-[2/1] overflow-hidden rounded-xl shadow-lg">
            <Image
              alt={post.heroImage.alt || post.title}
              className="object-cover"
              fill
              priority
              sizes="56rem"
              src={post.heroImage.url}
            />
          </div>
        </div>
      )}

      <div className="container py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <RichText className="max-w-none" data={post.content} enableGutter={false} />

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <ShareButtons title={post.title} url={shareUrl} />
              <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/blog/">
                ← All articles
              </Link>
            </div>

            {(olderPost || newerPost) && (
              <nav aria-label="More articles" className="mt-8 grid gap-4 sm:grid-cols-2">
                {olderPost ? (
                  <Link
                    className="group rounded-xl border border-border bg-white p-5 transition hover:border-brand-300 hover:shadow-md"
                    href={`/${olderPost.slug}/`}
                    rel="prev"
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      <ArrowLeft aria-hidden className="size-3.5" />
                      Previous article
                    </p>
                    <p className="mt-2 line-clamp-2 font-semibold text-navy-950 group-hover:text-brand-700">
                      {olderPost.title}
                    </p>
                  </Link>
                ) : (
                  <span aria-hidden />
                )}
                {newerPost && (
                  <Link
                    className="group rounded-xl border border-border bg-white p-5 text-right transition hover:border-brand-300 hover:shadow-md"
                    href={`/${newerPost.slug}/`}
                    rel="next"
                  >
                    <p className="flex items-center justify-end gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      Next article
                      <ArrowRight aria-hidden className="size-3.5" />
                    </p>
                    <p className="mt-2 line-clamp-2 font-semibold text-navy-950 group-hover:text-brand-700">
                      {newerPost.title}
                    </p>
                  </Link>
                )}
              </nav>
            )}
          </div>

          <aside className="space-y-10 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
            <TableOfContents items={headings} />
            <SidebarCTA siteSettings={siteSettings} />
            <SidebarRecentPosts excludeId={post.id} />
          </aside>
        </div>
      </div>

      {!!relatedPosts.length && (
        <section className="bg-card py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-navy-950">Keep Reading</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABanner
        body="Talk to a licensed electrician today — free estimates, 24/7 emergency service."
        heading="Have an electrical project in mind?"
        phone={siteSettings.phone}
      />
    </article>
  )
}
