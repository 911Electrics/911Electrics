import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * Numbered pagination matching the legacy WordPress URL scheme:
 * page 1 lives at `basePath`, page N at `${basePath}page/N/`.
 *
 * The visible page buttons are *windowed* (first, last, and a span around the
 * current page, with ellipses for the gaps). Rendering one button per page
 * pushed the row well past a phone's width once the blog grew past a handful
 * of pages — with 12 pages the un-wrapping flex row was ~700px, which made the
 * whole /blog document horizontally scrollable on mobile. `flex-wrap` is kept
 * as a final guard.
 */
function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  const SIBLINGS = 1 // pages shown on each side of the current page
  const first = 1
  const last = total

  const start = Math.max(first, current - SIBLINGS)
  const end = Math.min(last, current + SIBLINGS)

  const pages: (number | 'ellipsis')[] = []
  // Leading edge: always page 1, then an ellipsis if there's a gap.
  if (start > first) {
    pages.push(first)
    if (start > first + 1) pages.push('ellipsis')
  }
  for (let p = start; p <= end; p++) pages.push(p)
  // Trailing edge: an ellipsis if there's a gap, then the last page.
  if (end < last) {
    if (end < last - 1) pages.push('ellipsis')
    pages.push(last)
  }
  return pages
}

export function PaginationNav({
  basePath,
  currentPage,
  totalPages,
}: {
  basePath: string
  currentPage: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const hrefFor = (page: number) => (page <= 1 ? basePath : `${basePath}page/${page}/`)
  const pages = pageWindow(currentPage, totalPages)

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 && (
        <Link
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:border-brand-300 hover:text-brand-700"
          href={hrefFor(currentPage - 1)}
          rel="prev"
        >
          ← Newer
        </Link>
      )}
      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span
            aria-hidden
            className="px-2 py-2 text-sm text-muted-foreground"
            key={`ellipsis-${i}`}
          >
            …
          </span>
        ) : (
          <Link
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              page === currentPage
                ? 'bg-brand-600 text-white'
                : 'border border-border bg-white text-navy-900 hover:border-brand-300 hover:text-brand-700',
            )}
            href={hrefFor(page)}
            key={page}
          >
            {page}
          </Link>
        ),
      )}
      {currentPage < totalPages && (
        <Link
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:border-brand-300 hover:text-brand-700"
          href={hrefFor(currentPage + 1)}
          rel="next"
        >
          Older →
        </Link>
      )}
    </nav>
  )
}
