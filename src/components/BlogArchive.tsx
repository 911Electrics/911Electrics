import { notFound } from 'next/navigation'
import React from 'react'

import { FeaturedPostCard, PostCard } from '@/components/PostCard'
import { PaginationNav } from '@/components/PaginationNav'
import {
  CategoryChips,
  SidebarCTA,
  SidebarCategories,
  SidebarRecentPosts,
} from '@/components/blog/Sidebar'
import { CTABanner } from '@/components/sections/CTABanner'
import { getPublishedPosts } from '@/lib/posts'
import { getSiteSettings } from '@/lib/queries'

/** Matches the legacy WordPress archive page size. */
export const POSTS_PER_PAGE = 10

/**
 * Blog archive shared by /blog/ (page 1) and /blog/page/N/ — same URL
 * scheme WordPress used, so legacy pagination links keep working.
 * Page 1 leads with the newest post as a large featured card.
 */
export async function BlogArchive({ page }: { page: number }) {
  const [{ posts, total }, siteSettings] = await Promise.all([
    getPublishedPosts({ limit: POSTS_PER_PAGE, offset: (page - 1) * POSTS_PER_PAGE }),
    getSiteSettings(),
  ])

  if (page > 1 && posts.length === 0) notFound()

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
  const [featured, ...rest] = posts
  const gridPosts = page === 1 ? rest : posts

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">Blog</p>
          <h1 className="mt-2 text-3xl font-bold text-balance md:text-5xl">
            Electrical Tips, News &amp; Expert Insights for Los Angeles Property Owners
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Practical advice from licensed Los Angeles electricians — EV chargers, panel upgrades,
            rebates, safety and more.
          </p>
          <CategoryChips />
        </div>
      </header>

      <section className="py-14">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground">No articles published yet.</p>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                {page === 1 && featured && <FeaturedPostCard post={featured} />}
                <div className={`grid gap-6 sm:grid-cols-2 ${page === 1 ? 'mt-10' : ''}`}>
                  {gridPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <PaginationNav basePath="/blog/" currentPage={page} totalPages={totalPages} />
              </div>

              <aside className="space-y-10 lg:sticky lg:top-28 lg:self-start">
                <SidebarCTA siteSettings={siteSettings} />
                <SidebarCategories />
                <SidebarRecentPosts />
              </aside>
            </div>
          )}
        </div>
      </section>

      <CTABanner phone={siteSettings.phone} />
    </>
  )
}
