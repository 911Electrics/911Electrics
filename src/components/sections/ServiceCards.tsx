import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { ServiceNav } from '@/db/types'

import { SectionHeading } from './SectionHeading'

export function ServiceCards({
  heading,
  intro,
  services,
}: {
  heading?: string | null
  intro?: string | null
  services: ServiceNav[]
}) {
  if (!services.length) return null

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <SectionHeading
          eyebrow="What We Do"
          subtitle={intro}
          title={heading || 'Electrical Solutions We Offer'}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              href={`/${service.slug}/`}
              key={service.id}
            >
              {service.cardImage?.url ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-card">
                  <Image
                    alt={service.cardImage.alt || service.navLabel}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={service.cardImage.url}
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-brand-700 to-navy-900" />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-navy-950 group-hover:text-brand-700">
                  {service.navLabel}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {service.shortDescription}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Explore service
                  <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
