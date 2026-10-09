'use client'

import React, { useEffect, useState } from 'react'

import type { TocItem } from '@/lib/blog'

import { cn } from '@/utilities/ui'

/**
 * "On this page" navigation with scroll-spy: the heading currently in view
 * is highlighted as the reader scrolls.
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (!headings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      // Trigger when a heading enters the top third of the viewport
      { rootMargin: '-96px 0px -66% 0px' },
    )
    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav aria-label="Table of contents">
      <h2 className="text-sm font-semibold tracking-wide text-navy-950 uppercase">On this page</h2>
      <ul className="mt-3 space-y-1 border-l border-border text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className={cn(
                '-ml-px block border-l-2 py-1 leading-snug transition-colors',
                item.depth === 3 ? 'pl-7' : 'pl-4',
                activeId === item.id
                  ? 'border-brand-600 font-medium text-brand-700'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-navy-900',
              )}
              href={`#${item.id}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
