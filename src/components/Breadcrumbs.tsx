import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

export type Crumb = { name: string; path: string }

/**
 * Visible breadcrumb trail — pairs with the BreadcrumbList JSON-LD that
 * pages already emit. Last item is the current page (not a link).
 */
export function Breadcrumbs({ items, dark = false }: { items: Crumb[]; dark?: boolean }) {
  if (items.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className="container pt-5">
      <ol className={cn('flex flex-wrap items-center gap-1.5 text-sm', dark ? 'text-white/70' : 'text-muted-foreground')}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li className="flex items-center gap-1.5" key={item.path}>
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 opacity-60" />}
              {isLast ? (
                <span aria-current="page" className={cn('font-medium', dark ? 'text-white' : 'text-navy-950')}>
                  {item.name}
                </span>
              ) : (
                <Link className="hover:underline" href={item.path}>
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
