import { Phone, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { SiteSettings } from '@/db/types'
import { telHref } from '@/lib/format'
import { getCategoriesWithCounts, getPublishedPosts } from '@/lib/posts'
import { formatDateTime } from '@/utilities/formatDateTime'
import { cn } from '@/utilities/ui'

/** Lead-gen card — the sidebar's job on a contractor's blog. */
export function SidebarCTA({ siteSettings }: { siteSettings: SiteSettings }) {
  return (
    <div className="overflow-hidden rounded-xl bg-navy-950 p-6 text-white">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-accent uppercase">
        <ShieldCheck aria-hidden className="size-4" />
        Licensed &amp; Insured
      </p>
      <h2 className="mt-3 text-xl font-bold text-balance">Need an electrician in Los Angeles?</h2>
      <p className="mt-2 text-sm text-white/75">
        Free estimates, upfront pricing and 24/7 emergency service from licensed pros.
      </p>
      <a
        className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 font-semibold transition hover:bg-brand-700"
        href={telHref(siteSettings.phone)}
      >
        <Phone aria-hidden className="size-4" />
        {siteSettings.phone}
      </a>
      <Link
        className="mt-2.5 block rounded-lg border border-white/25 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-white/10"
        href="/contact/"
      >
        Get a Free Quote
      </Link>
    </div>
  )
}

/** Category list with live post counts. */
export async function SidebarCategories({ activeSlug }: { activeSlug?: string }) {
  const categories = (await getCategoriesWithCounts()).filter((c) => c.count > 0)
  if (!categories.length) return null

  return (
    <nav aria-label="Blog categories">
      <h2 className="text-sm font-semibold tracking-wide text-navy-950 uppercase">Categories</h2>
      <ul className="mt-3 space-y-1">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition',
                category.slug === activeSlug
                  ? 'bg-brand-50 font-semibold text-brand-700'
                  : 'text-navy-900 hover:bg-card',
              )}
              href={`/category/${category.slug}/`}
            >
              <span>{category.title}</span>
              <span className="text-xs text-muted-foreground">{category.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Compact recent-posts list with thumbnails. */
export async function SidebarRecentPosts({ excludeId }: { excludeId?: number }) {
  const { posts } = await getPublishedPosts({ limit: 4, excludeId })
  if (!posts.length) return null

  return (
    <nav aria-label="Recent articles">
      <h2 className="text-sm font-semibold tracking-wide text-navy-950 uppercase">
        Recent Articles
      </h2>
      <ul className="mt-3 space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <Link className="group flex gap-3" href={`/${post.slug}/`}>
              {post.heroImage?.url ? (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-card">
                  <Image alt={post.heroImage.alt || post.title} className="object-cover" fill sizes="64px" src={post.heroImage.url} />
                </div>
              ) : (
                <div className="size-16 shrink-0 rounded-lg bg-gradient-to-br from-brand-700 to-navy-900" />
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-snug font-medium text-navy-950 group-hover:text-brand-700">
                  {post.title}
                </p>
                {post.publishedAt && (
                  <time className="mt-1 block text-xs text-muted-foreground" dateTime={post.publishedAt}>
                    {formatDateTime(post.publishedAt)}
                  </time>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Filter chips shown under the archive header (All Articles + categories). */
export async function CategoryChips({ activeSlug }: { activeSlug?: string }) {
  const categories = (await getCategoriesWithCounts()).filter((c) => c.count > 0)
  if (!categories.length) return null

  const chipClass = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-1.5 text-sm font-medium transition',
      active
        ? 'border-amber-accent bg-amber-accent text-navy-950'
        : 'border-white/30 text-white/90 hover:border-white hover:bg-white/10',
    )

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link className={chipClass(!activeSlug)} href="/blog/">
        All Articles
      </Link>
      {categories.map((category) => (
        <Link className={chipClass(category.slug === activeSlug)} href={`/category/${category.slug}/`} key={category.id}>
          {category.title}
        </Link>
      ))}
    </div>
  )
}
