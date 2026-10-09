import { Phone, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { ScrollTopLink } from '@/components/ScrollTopLink'
import { SiteLogo } from '@/components/layout/SiteLogo'
import { telHref } from '@/lib/format'
import { cityPath, getCitiesNav, getFeaturedTestimonials, getServicesNav, getSiteSettings } from '@/lib/queries'

import { DesktopDropdown } from './DesktopDropdown'
import { MobileNav } from './MobileNav'

export type NavItem = {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

export async function SiteHeader() {
  const [siteSettings, services, cities, testimonials] = await Promise.all([
    getSiteSettings(),
    getServicesNav(),
    getCitiesNav(),
    getFeaturedTestimonials(),
  ])

  const nav: NavItem[] = [
    { label: 'Home', href: '/' },
    {
      label: 'Services',
      href: '/services/',
      children: services.map((s) => ({ label: s.navLabel, href: `/${s.slug}/` })),
    },
    {
      label: 'Service Areas',
      href: '/service-areas/',
      children: cities.map((c) => ({ label: c.cityName, href: cityPath(c) })),
    },
    { label: 'About Us', href: '/about/' },
    // The homepage reviews section only renders when featured testimonials
    // exist — without this guard the link scrolls nowhere
    ...(testimonials.length ? [{ label: 'Reviews', href: '/#reviews' }] : []),
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ]

  const phone = siteSettings.phone
  const phoneHref = telHref(phone)

  // Prefer the logo set in Site Settings (admin); fall back to the bundled
  // brand asset so the header always renders a real logo.
  const logo = siteSettings.logo
  const logoSrc = (logo && typeof logo === 'object' && logo.url) || '/logo.png'
  const logoAlt =
    (logo && typeof logo === 'object' && logo.alt) || `${siteSettings.businessName} logo`

  // z-50 keeps the header — and the full-screen mobile drawer nested inside it —
  // above the z-40 StickyCallBar. At equal z-index the later-in-DOM sticky bar
  // painted over the open drawer's Call button (QA-07).
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top strip */}
      <div className="bg-navy-950 text-white">
        <div className="container flex items-center justify-between gap-4 py-1.5 text-xs sm:text-sm">
          <p className="flex items-center gap-1.5">
            <ShieldCheck aria-hidden className="size-4 text-amber-accent" />
            <span>Licensed &amp; Insured — Lic. #{siteSettings.licenseNumber}</span>
          </p>
          <p className="hidden items-center gap-1.5 sm:flex">
            <Zap aria-hidden className="size-4 text-amber-accent" />
            <span>{siteSettings.hoursLabel}</span>
          </p>
          <a className="flex items-center gap-1.5 font-semibold hover:text-amber-accent" href={phoneHref}>
            <Phone aria-hidden className="size-4" />
            {phone}
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="container flex items-center justify-between gap-6 py-3">
        <ScrollTopLink aria-label={siteSettings.businessName} className="flex items-center" href="/">
          <SiteLogo
            alt={logoAlt}
            className="h-11 w-auto sm:h-12"
            priority
            sizes="(min-width: 640px) 104px, 96px"
            src={logoSrc}
          />
        </ScrollTopLink>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) =>
            item.children?.length ? (
              <DesktopDropdown item={item} key={item.label} />
            ) : (
              <ScrollTopLink
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-900 hover:bg-brand-50 hover:text-brand-700"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </ScrollTopLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            className="hidden rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 md:inline-block"
            href="/contact/"
          >
            Get a Free Quote
          </Link>
          <MobileNav
            logoAlt={logoAlt}
            logoSrc={logoSrc}
            nav={nav}
            phone={phone}
            phoneHref={phoneHref}
          />
        </div>
      </div>
    </header>
  )
}
