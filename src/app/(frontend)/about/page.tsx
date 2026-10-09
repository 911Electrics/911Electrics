import type { Metadata } from 'next'

import React from 'react'

import { AboutSection } from '@/components/sections/AboutSection'
import { CTABanner } from '@/components/sections/CTABanner'
import { getHomepage, getSiteSettings } from '@/lib/queries'

export const revalidate = 3600

export default async function AboutPage() {
  const [homepage, siteSettings] = await Promise.all([getHomepage(), getSiteSettings()])

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            About Us
          </p>
          <h1 className="mt-2 text-3xl font-bold text-balance md:text-5xl">
            About {siteSettings.businessName}
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            A licensed, bonded, and insured electrical contractor (Lic. #
            {siteSettings.licenseNumber}) serving Los Angeles and the surrounding cities — from
            emergency repairs and panel upgrades to EV chargers, rewiring, and new construction.
          </p>
        </div>
      </header>

      <AboutSection
        body={homepage.aboutBody}
        differentiators={homepage.differentiators}
        heading={homepage.aboutHeading}
        image={homepage.aboutImage}
      />

      <CTABanner
        body={homepage.contactBody}
        heading={homepage.contactHeading}
        phone={siteSettings.phone}
      />
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings()
  return {
    title: `About Us | ${siteSettings.businessName}`,
    description: `Learn about ${siteSettings.businessName} — a licensed, bonded, and insured Los Angeles electrical contractor (Lic. #${siteSettings.licenseNumber}). EVITP, Tesla & SCE certified, C-10 licensed, serving homes and businesses across LA.`,
    alternates: { canonical: '/about/' },
  }
}
