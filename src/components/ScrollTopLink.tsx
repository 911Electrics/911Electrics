'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { type ComponentProps } from 'react'

/** Strip query/hash and any trailing slash so "/" , "/#about" and "/contact/"
 *  compare cleanly regardless of the trailingSlash config. */
const normalizePath = (value: string): string => {
  const path = value.split('#')[0].split('?')[0]
  return path.replace(/\/+$/, '') || '/'
}

/**
 * A Link that smooth-scrolls to the top of the page when you click through to
 * the route you're already on (e.g. the logo or "Home" on the homepage), which
 * a plain <Link> does nothing for. Behaves like a normal Link otherwise.
 */
export function ScrollTopLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname()

  return (
    <Link
      {...props}
      href={href}
      onClick={(e) => {
        // Same route (ignoring trailing slash / hash): a plain Link would do
        // nothing, so reset the view to the top of the page and drop any
        // lingering #anchor so the logo always "goes home".
        if (typeof href === 'string' && normalizePath(href) === normalizePath(pathname)) {
          e.preventDefault()
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        onClick?.(e)
      }}
    />
  )
}
