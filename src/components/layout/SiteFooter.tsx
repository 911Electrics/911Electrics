import { Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { SiteLogo } from '@/components/layout/SiteLogo'
import { telHref } from '@/lib/format'
import { cityPath, getCitiesNav, getFeaturedTestimonials, getServicesNav, getSiteSettings } from '@/lib/queries'

const socialLabels: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  pinterest: 'Pinterest',
  google: 'Google',
  yelp: 'Yelp',
}

export async function SiteFooter() {
  const [siteSettings, services, cities, testimonials] = await Promise.all([
    getSiteSettings(),
    getServicesNav(),
    getCitiesNav(),
    getFeaturedTestimonials(),
  ])

  const { address } = siteSettings
  const year = new Date().getFullYear()
  const topCities = cities.slice(0, 12)

  const logo = siteSettings.logo
  const logoSrc = (logo && typeof logo === 'object' && logo.url) || '/logo.png'
  const logoAlt = (logo && typeof logo === 'object' && logo.alt) || siteSettings.businessName

  return (
    <footer className="bg-navy-950 pb-20 text-white md:pb-0">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand + NAP */}
        <div>
          <Link aria-label={siteSettings.businessName} className="inline-flex rounded-lg bg-white p-2.5" href="/">
            <SiteLogo alt={logoAlt} className="h-11 w-auto" src={logoSrc} />
          </Link>
          <ul className="mt-5 space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2.5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-accent" />
              <span>
                {address?.street}
                <br />
                {address?.city}, {address?.state} {address?.zip}
              </span>
            </li>
            <li>
              <a className="flex items-center gap-2.5 hover:text-white" href={telHref(siteSettings.phone)}>
                <Phone aria-hidden className="size-4 text-amber-accent" />
                {siteSettings.phone}
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2.5 hover:text-white" href={`mailto:${siteSettings.email}`}>
                <Mail aria-hidden className="size-4 text-amber-accent" />
                {siteSettings.email}
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/60">
            CA License #{siteSettings.licenseNumber} · {siteSettings.hoursLabel}
          </p>
        </div>

        {/* Services */}
        <nav aria-label="Footer services">
          <h2 className="text-sm font-semibold tracking-wide text-amber-accent uppercase">Services</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.id}>
                <Link className="text-white/80 hover:text-white" href={`/${s.slug}/`}>
                  {s.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Service areas */}
        <nav aria-label="Footer service areas">
          <h2 className="text-sm font-semibold tracking-wide text-amber-accent uppercase">Service Areas</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {topCities.map((c) => (
              <li key={c.id}>
                <Link className="text-white/80 hover:text-white" href={cityPath(c)}>
                  {c.cityName}
                </Link>
              </li>
            ))}
          </ul>
          <Link className="mt-3 inline-block text-sm font-medium text-amber-accent hover:underline" href="/service-areas/">
            View all areas →
          </Link>
        </nav>

        {/* Company */}
        <nav aria-label="Footer company">
          <h2 className="text-sm font-semibold tracking-wide text-amber-accent uppercase">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="text-white/80 hover:text-white" href="/about/">About Us</Link></li>
            {testimonials.length > 0 && (
              <li><Link className="text-white/80 hover:text-white" href="/#reviews">Reviews</Link></li>
            )}
            <li><Link className="text-white/80 hover:text-white" href="/blog/">Blog</Link></li>
            <li><Link className="text-white/80 hover:text-white" href="/contact/">Contact</Link></li>
          </ul>
          {(siteSettings.socials?.length ?? 0) > 0 && (
            <>
              <h2 className="mt-6 text-sm font-semibold tracking-wide text-amber-accent uppercase">Follow Us</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {siteSettings.socials?.map((s) => (
                  <li key={s.platform}>
                    <a
                      className="text-white/80 hover:text-white"
                      href={s.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {socialLabels[s.platform] ?? s.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row">
          <p>
            © {year} {siteSettings.businessName} All rights reserved. ·{' '}
            <Link className="underline-offset-2 hover:text-white hover:underline" href="/privacy-policy/">
              Privacy Policy
            </Link>
            {' · '}
            <Link className="underline-offset-2 hover:text-white hover:underline" href="/terms-of-service/">
              Terms of Service
            </Link>
          </p>
          <p>Licensed, Bonded &amp; Insured · CA Lic. #{siteSettings.licenseNumber}</p>
        </div>
      </div>
    </footer>
  )
}
