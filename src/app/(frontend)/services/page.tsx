import type { Metadata } from 'next'

import React from 'react'

import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { ServiceCards } from '@/components/sections/ServiceCards'
import { getServicesNav, getSiteSettings } from '@/lib/queries'

export default async function ServicesIndexPage() {
  const [services, siteSettings] = await Promise.all([
    getServicesNav(),
    getSiteSettings(),
  ])

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            Our Services
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            Professional Services in Los Angeles, CA
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Residential and commercial electrical work — from urgent repairs to complete new
            construction wiring. Licensed, bonded and insured.
          </p>
        </div>
      </header>
      <ServiceCards heading="Everything We Do" services={services} />
      <CTABanner phone={siteSettings.phone} />
      <ContactSection siteSettings={siteSettings} />
    </>
  )
}

export const metadata: Metadata = {
  // Ported verbatim from the live WP site — do not change until rankings stabilize
  title: '911 Construction & Electric Services for Your Needs',
  description:
    'Full-service licensed electrician in Los Angeles: electrical repairs, panel upgrades, EV charger installation, lighting, new construction and 24/7 emergency service.',
  alternates: { canonical: '/services/' },
}
