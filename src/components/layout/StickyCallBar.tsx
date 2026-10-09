import { MessageSquareText, Phone } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { telHref } from '@/lib/format'
import { getSiteSettings } from '@/lib/queries'

/**
 * Mobile-only fixed bottom bar: the two actions that win local-service
 * leads — call now, get a quote.
 */
export async function StickyCallBar() {
  const siteSettings = await getSiteSettings()

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-navy-900 bg-navy-950 md:hidden">
      <a
        className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white active:bg-navy-900"
        href={telHref(siteSettings.phone)}
      >
        <Phone aria-hidden className="size-4 text-amber-accent" />
        Call 24/7
      </a>
      <Link
        className="flex items-center justify-center gap-2 border-l border-navy-900 bg-brand-600 py-3.5 text-sm font-semibold text-white active:bg-brand-700"
        href="/contact/"
      >
        <MessageSquareText aria-hidden className="size-4" />
        Free Quote
      </Link>
    </div>
  )
}
