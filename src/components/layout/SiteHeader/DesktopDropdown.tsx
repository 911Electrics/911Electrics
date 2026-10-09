'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { NavItem } from './index'

/**
 * Desktop nav dropdown. Click-to-open (not hover): the label is a plain link
 * to the landing page (e.g. /services/), and the caret button toggles the
 * panel. This keeps the sub-pages hidden until the user explicitly asks for
 * them, instead of dumping all of them on hover. State-driven so the menu
 * reliably closes after navigating — the header persists across client-side
 * navigation, so a CSS-only approach would leave the panel stuck open.
 */
export function DesktopDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // A long list (e.g. service-area cities) flows into a scrollable
  // multi-column panel instead of one tall column.
  const wide = (item.children?.length ?? 0) > 10

  // Close when navigation completes (also covers back/forward)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div
      className="relative flex items-center"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <Link
        className="inline-flex items-center rounded-md py-2 pl-3 pr-1 text-sm font-medium text-navy-900 hover:bg-brand-50 hover:text-brand-700"
        href={item.href}
        onClick={() => setOpen(false)}
      >
        {item.label}
      </Link>
      <button
        aria-expanded={open}
        aria-label={`${open ? 'Hide' : 'Show'} ${item.label} menu`}
        className="inline-flex items-center rounded-md py-2 pl-1 pr-2 text-navy-900 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <svg
          aria-hidden
          className={`size-3 fill-current transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
        >
          <path d="M6 8.5 1.5 4h9L6 8.5Z" />
        </svg>
      </button>
      <div
        className={`absolute left-0 top-full z-50 rounded-lg border border-border bg-white p-2 shadow-lg transition ${
          wide
            ? 'grid max-h-[70vh] w-[34rem] max-w-[90vw] grid-cols-2 gap-x-2 overflow-y-auto sm:grid-cols-3'
            : 'min-w-64'
        } ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        {item.children?.map((child) => (
          <Link
            className="block rounded-md px-3 py-2 text-sm text-navy-900 hover:bg-brand-50 hover:text-brand-700"
            href={child.href}
            key={child.href}
            onClick={() => setOpen(false)}
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
