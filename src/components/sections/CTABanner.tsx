import { Phone } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { telHref } from '@/lib/format'

export function CTABanner({
  heading,
  body,
  phone,
}: {
  heading?: string | null
  body?: string | null
  phone: string
}) {
  return (
    <section className="bg-gradient-to-r from-brand-700 to-brand-900 py-14">
      <div className="container flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
        <div>
          <h2 className="text-2xl font-bold text-balance text-white md:text-3xl">
            {heading || 'Need an Electrician? We Answer 24/7'}
          </h2>
          {body && <p className="mt-2 max-w-2xl text-white/85">{body}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-4">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-amber-accent px-6 py-3.5 font-semibold text-navy-950 shadow-lg transition hover:brightness-110"
            href={telHref(phone)}
          >
            <Phone aria-hidden className="size-5" />
            Call {phone}
          </a>
          <Link
            className="rounded-lg border-2 border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-brand-800"
            href="/contact/"
          >
            Request a Quote
          </Link>
        </div>
      </div>
    </section>
  )
}
