import Image from 'next/image'
import React from 'react'

import type { ImageLike } from '@/db/types'

import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs'
import { QuoteForm } from '@/components/forms/QuoteForm'
import { telHref } from '@/lib/format'

import { RatingBadge } from './RatingBadge'

/**
 * Shared hero for home / service / city pages: navy gradient over an
 * optional photo, H1 + subheading + trust signals on the left, embedded
 * quote form on the right.
 */
export function Hero({
  heading,
  subheading,
  image,
  phone,
  licenseNumber,
  rating,
  defaultService,
  breadcrumbs,
}: {
  heading: string
  subheading?: string | null
  image?: ImageLike | number | null
  phone: string
  licenseNumber: string
  rating?: { value?: number | null; count?: number | null } | null
  defaultService?: string
  breadcrumbs?: Crumb[]
}) {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      {image && typeof image === 'object' && image.url && (
        <Image
          alt={image.alt || ''}
          className="object-cover opacity-40"
          fill
          priority
          sizes="100vw"
          src={image.url}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950/90 via-navy-950/70 to-brand-900/40" />

      {breadcrumbs && (
        <div className="relative">
          <Breadcrumbs dark items={breadcrumbs} />
        </div>
      )}

      <div className="container relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1fr_minmax(20rem,26rem)]">
        <div>
          {rating?.count ? <RatingBadge count={rating.count} value={rating.value ?? 5} /> : null}
          <h1 className="mt-4 text-4xl font-bold text-balance text-white md:text-5xl">{heading}</h1>
          {subheading && <p className="mt-4 max-w-xl text-lg text-white/85">{subheading}</p>}

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/90">
            <li>✓ Licensed &amp; Insured (Lic. #{licenseNumber})</li>
            <li>✓ 24/7 Emergency Service</li>
            <li>✓ Free Estimates</li>
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              className="rounded-lg bg-amber-accent px-6 py-3.5 font-semibold text-navy-950 shadow-lg transition hover:brightness-110"
              href={telHref(phone)}
            >
              Call {phone}
            </a>
          </div>

          {/* Verifiable credential strip. Replaces the old "Rated on Google,
              Yelp and more" review graphic, which asserted ratings the site
              can't substantiate (no synced reviews). These certifications are
              real and verifiable; a genuine rating badge renders above via
              `rating` once aggregate_rating_count is set from real reviews. */}
          <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold tracking-wide text-white/75 uppercase">
            {['EVITP Certified', 'Tesla Certified', 'SCE Certified', 'C-10 Licensed'].map(
              (cred, i) => (
                <React.Fragment key={cred}>
                  {i > 0 && <li aria-hidden className="text-white/30">•</li>}
                  <li>{cred}</li>
                </React.Fragment>
              ),
            )}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl" id="quote">
          <h2 className="text-xl font-bold text-navy-950">Get Your Free Quote</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We respond fast — usually within 15 minutes.
          </p>
          <QuoteForm defaultService={defaultService} formLocation="hero" />
        </div>
      </div>
    </section>
  )
}
