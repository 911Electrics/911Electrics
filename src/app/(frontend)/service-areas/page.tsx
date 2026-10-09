import type { Metadata } from 'next'

import { MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { cityPath, getCitiesNav, getSiteSettings } from '@/lib/queries'

export default async function ServiceAreasPage() {
  const [cities, siteSettings] = await Promise.all([
    getCitiesNav(),
    getSiteSettings(),
  ])

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            Service Areas
          </p>
          <h1 className="mt-2 text-3xl font-bold text-balance md:text-5xl">
            Electrician Service Areas Across Los Angeles County for Repairs, Panel Upgrades &amp; EV
            Chargers
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Fast response across {cities.length}+ communities — find your neighborhood below.
          </p>
        </div>
      </header>

      <section className="py-14">
        <div className="container">
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cities.map((city) => (
              <li key={city.id}>
                <Link
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-4 py-3 font-medium text-navy-900 shadow-sm transition hover:border-brand-300 hover:text-brand-700 hover:shadow"
                  href={cityPath(city)}
                >
                  <MapPin aria-hidden className="size-4 shrink-0 text-brand-600" />
                  Electrician in {city.cityName}, CA
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTABanner
        body="Don't see your city? We likely still serve you — give us a call."
        heading="Serving All of Greater Los Angeles"
        phone={siteSettings.phone}
      />
      <ContactSection siteSettings={siteSettings} />
    </>
  )
}

export const metadata: Metadata = {
  // Ported verbatim from the live WP site — do not change until rankings stabilize
  title: 'Electrical Service Los Angeles for Your Property Needs - 911 Construction & Electric Inc.',
  description:
    'Licensed electrician serving 43+ communities across Los Angeles County — Pasadena, Glendale, Burbank, the San Fernando Valley and beyond. 24/7 emergency service.',
  alternates: { canonical: '/service-areas/' },
}
