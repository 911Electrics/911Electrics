'use client'

import { ChevronDown, Menu, Phone, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ScrollTopLink } from '@/components/ScrollTopLink'
import { SiteLogo } from '@/components/layout/SiteLogo'

import type { NavItem } from './index'

export function MobileNav({
  nav,
  phone,
  phoneHref,
  logoSrc,
  logoAlt,
}: {
  nav: NavItem[]
  phone: string
  phoneHref: string
  logoSrc: string
  logoAlt: string
}) {
  const [open, setOpen] = useState(false)
  // Which parent's sub-pages are expanded (accordion — only one at a time).
  // Collapsed by default so opening the menu shows the top-level pages, not
  // every city/service at once.
  const [expanded, setExpanded] = useState<string | null>(null)
  const pathname = usePathname()

  // Close on navigation
  useEffect(() => {
    setOpen(false)
    setExpanded(null)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label="Open menu"
        className="flex size-10 items-center justify-center rounded-lg border border-border text-navy-900"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        // Full-screen panel: independent of header height, no gaps
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <ScrollTopLink className="flex items-center" href="/" onClick={() => setOpen(false)}>
              <SiteLogo alt={logoAlt} className="h-10 w-auto" sizes="88px" src={logoSrc} />
            </ScrollTopLink>
            <button
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-lg border border-border text-navy-900"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 pb-8">
            {nav.map((item) => {
              const hasChildren = !!item.children?.length
              const isExpanded = expanded === item.label
              return (
                <div className="border-b border-border" key={item.label}>
                  <div className="flex items-center justify-between">
                    <ScrollTopLink
                      className="block flex-1 py-3 text-base font-medium text-navy-900"
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </ScrollTopLink>
                    {hasChildren && (
                      // Caret toggles the sub-pages. The label still links to
                      // the landing page; tapping here just reveals children.
                      <button
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} ${item.label} pages`}
                        className="-mr-2 flex size-11 items-center justify-center text-navy-900"
                        onClick={() => setExpanded(isExpanded ? null : item.label)}
                        type="button"
                      >
                        <ChevronDown
                          className={`size-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    // Long lists (service-area cities) scroll within their own
                    // area so they don't bury the rest of the menu.
                    <div
                      className={`pb-2 ${item.children!.length > 12 ? 'max-h-64 overflow-y-auto' : ''}`}
                    >
                      {item.children!.map((child) => (
                        <Link
                          className="block border-t border-border py-2.5 pl-6 text-sm text-muted-foreground"
                          href={child.href}
                          key={child.href}
                          onClick={() => setOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="border-t border-border p-4 pb-6">
            <a
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white"
              href={phoneHref}
            >
              <Phone className="size-5" />
              Call {phone}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
