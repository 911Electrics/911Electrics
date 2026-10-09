import { Phone, Zap } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div className="bg-navy-950 py-24 text-white md:py-32">
      <div className="container max-w-2xl text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-600">
          <Zap aria-hidden className="size-9" />
        </span>
        <p className="mt-6 text-sm font-semibold tracking-widest text-amber-accent uppercase">
          404 — Page Not Found
        </p>
        <h1 className="mt-3 text-3xl font-bold text-balance md:text-5xl">
          Looks like this circuit is dead.
        </h1>
        <p className="mt-4 text-lg text-white/80">
          The page you&apos;re looking for doesn&apos;t exist or has moved. If you need an
          electrician, we&apos;re still very much live — 24/7.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-amber-accent px-6 py-3.5 font-semibold text-navy-950 shadow-lg transition hover:brightness-110"
            href="tel:+17472558595"
          >
            <Phone aria-hidden className="size-5" />
            Call 747-255-8595
          </a>
          <Link
            className="rounded-lg border-2 border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-navy-950"
            href="/"
          >
            Back to Homepage
          </Link>
        </div>
        <nav aria-label="Helpful links" className="mt-10 text-sm text-white/70">
          <Link className="underline-offset-4 hover:underline" href="/services/">
            Our Services
          </Link>
          <span className="mx-3">·</span>
          <Link className="underline-offset-4 hover:underline" href="/service-areas/">
            Service Areas
          </Link>
          <span className="mx-3">·</span>
          <Link className="underline-offset-4 hover:underline" href="/blog/">
            Blog
          </Link>
          <span className="mx-3">·</span>
          <Link className="underline-offset-4 hover:underline" href="/contact/">
            Contact
          </Link>
        </nav>
      </div>
    </div>
  )
}
