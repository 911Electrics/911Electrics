import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import React from 'react'

import type { SiteSettings } from '@/db/types'

import { QuoteForm } from '@/components/forms/QuoteForm'
import { telHref } from '@/lib/format'

import { SectionHeading } from './SectionHeading'

export function ContactSection({
  heading,
  body,
  siteSettings,
  formLocation = 'contact',
  showMap = true,
}: {
  heading?: string | null
  body?: string | null
  siteSettings: SiteSettings
  formLocation?: 'contact' | 'contact-page'
  showMap?: boolean
}) {
  const { address } = siteSettings
  const fullAddress = `${address?.street}, ${address?.city}, ${address?.state} ${address?.zip}`

  return (
    <section className="scroll-mt-28 bg-card py-16 md:py-20" id="contact">
      <div className="container">
        <SectionHeading
          eyebrow="Contact Us"
          subtitle={body}
          title={heading || 'Get Your Free Quote Today'}
        />
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <QuoteForm formLocation={formLocation} withMessage />
          </div>
          <div>
            <ul className="space-y-5">
              <li className="flex items-start gap-3.5">
                <Phone aria-hidden className="mt-1 size-5 text-brand-600" />
                <div>
                  <h3 className="font-semibold text-navy-950">Phone</h3>
                  <a className="text-muted-foreground hover:text-brand-700" href={telHref(siteSettings.phone)}>
                    {siteSettings.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3.5">
                <Mail aria-hidden className="mt-1 size-5 text-brand-600" />
                <div>
                  <h3 className="font-semibold text-navy-950">Email</h3>
                  <a className="text-muted-foreground hover:text-brand-700" href={`mailto:${siteSettings.email}`}>
                    {siteSettings.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3.5">
                <MapPin aria-hidden className="mt-1 size-5 text-brand-600" />
                <div>
                  <h3 className="font-semibold text-navy-950">Office</h3>
                  <p className="text-muted-foreground">{fullAddress}</p>
                </div>
              </li>
              <li className="flex items-start gap-3.5">
                <Clock aria-hidden className="mt-1 size-5 text-brand-600" />
                <div>
                  <h3 className="font-semibold text-navy-950">Hours</h3>
                  <p className="text-muted-foreground">{siteSettings.hoursLabel}</p>
                </div>
              </li>
            </ul>
            {showMap && (
              <iframe
                className="mt-7 h-64 w-full rounded-xl border border-border"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                title={`Map showing ${siteSettings.businessName} at ${fullAddress}`}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
