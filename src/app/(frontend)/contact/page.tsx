import type { Metadata } from 'next'

import React from 'react'

import { ContactSection } from '@/components/sections/ContactSection'
import { CTABanner } from '@/components/sections/CTABanner'
import { getSiteSettings } from '@/lib/queries'

export default async function ContactPage() {
  const siteSettings = await getSiteSettings()

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container">
          <p className="text-sm font-semibold tracking-widest text-amber-accent uppercase">
            Contact Us
          </p>
          <h1 className="mt-2 text-3xl font-bold text-balance md:text-5xl">
            Contact 911 Construction &amp; Electric in Los Angeles, CA
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Call, email, or send the form below — we answer 24/7 for emergencies and respond to
            quote requests fast.
          </p>
        </div>
      </header>
      <ContactSection
        body="Tell us about your project and we'll get back to you with a free estimate."
        formLocation="contact-page"
        heading="Request Your Free Quote"
        siteSettings={siteSettings}
      />
      <CTABanner
        body="Sparking outlets, power loss, or burning smells? Don't wait."
        heading="Electrical Emergency?"
        phone={siteSettings.phone}
      />
    </>
  )
}

export const metadata: Metadata = {
  // Ported verbatim from the live WP site — do not change until rankings stabilize
  title: 'Contact Us 911 Construction & Electric Today',
  description:
    'Contact 911 Construction & Electric Inc. — licensed Los Angeles electrician. Call 747-255-8595 for 24/7 emergency service or request a free quote online.',
  alternates: { canonical: '/contact/' },
}
