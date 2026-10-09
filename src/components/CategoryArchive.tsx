import { notFound } from 'next/navigation'
import React from 'react'

import { POSTS_PER_PAGE } from '@/components/BlogArchive'
import { PaginationNav } from '@/components/PaginationNav'
import { PostCard } from '@/components/PostCard'
import {
  CategoryChips,
  SidebarCTA,
  SidebarCategories,
  SidebarRecentPosts,
} from '@/components/blog/Sidebar'
import { CTABanner } from '@/components/sections/CTABanner'
import { getCategoryBySlug, getPublishedPosts } from '@/lib/posts'
import { getSiteSettings } from '@/lib/queries'

/**
 * Category archive shared by /category/X/ and /category/X/page/N/ —
 * preserves the WordPress pagination URL scheme.
 */
export async function CategoryArchive({
  categorySlug,
  page,
}: {
  categorySlug: string
  page: number
}) {
  const category = await getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const [{ posts, total }, siteSettings] = await Promise.all([
    getPublishedPosts({ limit: POSTS_PER_PAGE, offset: (page - 1) * POSTS_PER_PAGE, categorySlug }),
    getSiteSettings(),
  ])

  if (page > 1 && posts.length === 0) notFound()
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE))

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            Category
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Category: {category.title}</h1>
          <CategoryChips activeSlug={categorySlug} />
        </div>
      </header>

      <section className="py-14">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground">No articles in this category yet.</p>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <PaginationNav
                  basePath={`/category/${categorySlug}/`}
                  currentPage={page}
                  totalPages={totalPages}
                />
              </div>

              <aside className="space-y-10 lg:sticky lg:top-28 lg:self-start">
                <SidebarCTA siteSettings={siteSettings} />
                <SidebarCategories activeSlug={categorySlug} />
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
