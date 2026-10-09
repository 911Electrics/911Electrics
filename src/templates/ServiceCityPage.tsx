import { ArrowRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { CityNav, SiteSettings } from '@/db/types'
import type { CityDetail } from '@/lib/cities'
import type { ServiceDetail } from '@/lib/services'

import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { FAQAccordion } from '@/components/sections/FAQAccordion'
import { FeatureBlocks } from '@/components/sections/FeatureBlocks'
import { Hero } from '@/components/sections/Hero'
import RichText from '@/components/RichText'
import { JsonLd } from '@/components/seo/JsonLd'
import { cityRegionLabel, nearbyCities } from '@/lib/city-regions'
import {
  breadcrumbSchema,
  electricianSchema,
  faqSchema,
  jsonLdGraph,
  lexicalToPlainText,
  serviceSchema,
} from '@/lib/schema-org'
import { isEligibleCity, serviceCityPath } from '@/lib/service-city'
import { getServerSideURL } from '@/utilities/getURL'

const MAX_NEARBY = 9

/**
 * Programmatic "{service} in {city}" landing page. It surfaces the full service
 * content (features, benefits, FAQs) under a city-specific frame and links out
 * to the standalone service/city pages and the same service in nearby cities.
 */
export function ServiceCityPage({
  service,
  city,
  siteSettings,
  cities,
}: {
  service: ServiceDetail
  city: CityDetail
  siteSettings: SiteSettings
  cities: CityNav[]
}) {
  const path = serviceCityPath(service.slug, city.slug)
  const heading = `${service.navLabel} in ${city.cityName}, CA`
  const regionSuffix = city.region ? `, ${city.region}` : ''
  // Service names read naturally lowercased mid-sentence ("need panel upgrades in…"),
  // but the acronym must stay uppercase ("EV charger installation"), not "ev".
  const svcLower = service.navLabel.toLowerCase().replace(/\bev\b/g, 'EV')

  // Service FAQs + the city's own FAQs — each combo page carries a FAQ set
  // (and FAQ schema) no other page has, instead of a copy of the service's.
  const serviceFaqs = service.faqs ?? []
  const seenQuestions = new Set(serviceFaqs.map((f) => f.question.trim().toLowerCase()))
  const faqs = [
    ...serviceFaqs,
    ...(city.faqsOverride ?? []).filter((f) => !seenQuestions.has(f.question.trim().toLowerCase())),
  ]

  const base = getServerSideURL()
  const json = jsonLdGraph(
    electricianSchema(siteSettings, { areaServed: [city.cityName], pagePath: path }),
    {
      ...serviceSchema(service, siteSettings),
      name: heading,
      url: `${base}${path}`,
      areaServed: { '@type': 'City', name: city.cityName },
    },
    faqSchema(
      faqs.map((f) => ({
        question: f.question,
        answerText: lexicalToPlainText(f.answer),
      })),
    ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services/' },
      { name: service.navLabel, path: `/${service.slug}/` },
      { name: city.cityName, path },
    ]),
  )

  // Cities in the same part of LA County first — see lib/city-regions.
  const nearby = nearbyCities(city.slug, cities.filter(isEligibleCity), MAX_NEARBY)
  const areaLabel = cityRegionLabel(city.slug, city.region)

  return (
    <>
      <JsonLd json={json} />
      <Hero
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services/' },
          { name: service.navLabel, path: `/${service.slug}/` },
          { name: city.cityName, path },
        ]}
        defaultService={service.navLabel}
        heading={heading}
        image={service.heroImage}
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        rating={service.showRatingBadge ? siteSettings.aggregateRating : null}
        subheading={service.heroSubheading}
      />

      <section className="py-16">
        <div className="container max-w-4xl">
          <p className="text-lg leading-relaxed text-navy-900">
            Need {svcLower} in {city.cityName}
            {regionSuffix}? {siteSettings.businessName} is a licensed, bonded and insured electrical
            contractor (CA Lic. #{siteSettings.licenseNumber}) serving {city.cityName} and the
            surrounding area — with the permits, code compliance and clean workmanship every job
            deserves.
          </p>
        </div>
      </section>

      <FeatureBlocks
        heading={`Why Choose Us for ${service.navLabel} in ${city.cityName}`}
        items={service.features}
        tone="card"
      />

      <FeatureBlocks eyebrow="The Benefits" heading="What You Get" items={service.benefits} />

      {(city.localNotes || !!city.neighborhoods?.length) && (
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
              {service.navLabel} Throughout {city.cityName}
            </h2>
            {/* The city's own local notes — real corridors and landmarks, and
                which building department issues the permit. Every combo page
                for a city otherwise shares all of its prose with the other 55
                cities' pages for the same service; this is the one block that
                is genuinely about this city. It was already written and
                rendering on /electrician-{city}-ca/, just never surfaced here. */}
            {city.localNotes && (
              <RichText className="mt-5 max-w-none" data={city.localNotes} enableGutter={false} />
            )}
            {/* The generic lead-in only earns its place when there are no local
                notes; after that paragraph it just repeats "we serve all of X". */}
            {!city.localNotes && !!city.neighborhoods?.length && (
              <p className="mt-4 text-navy-800">
                Our electricians handle {svcLower} across every part of {city.cityName}
                {regionSuffix}, including:
              </p>
            )}
            {!!city.neighborhoods?.length && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {city.neighborhoods.map((n) => (
                  <li
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-sm font-medium text-navy-900 shadow-sm"
                    key={n.id}
                  >
                    <MapPin aria-hidden className="size-3.5 text-brand-600" />
                    {n.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <FAQAccordion
        faqs={faqs.length ? faqs : null}
        heading={`${service.navLabel} in ${city.cityName} — FAQs`}
      />

      <section className="bg-card py-16">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
            {service.navLabel} across {areaLabel}
          </h2>
          <p className="mt-4 text-navy-800">
            We also provide {svcLower} throughout {areaLabel} and nearby communities. Explore the
            full{' '}
            <Link
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              href={`/${service.slug}/`}
            >
              {service.navLabel}
            </Link>{' '}
            service or our{' '}
            <Link
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              href={`/${city.slug}/`}
            >
              electrician in {city.cityName}
            </Link>{' '}
            page.
          </p>
          {!!nearby.length && (
            <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((c) => (
                <li key={c.id}>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-navy-900 shadow-sm transition hover:text-brand-700"
                    href={serviceCityPath(service.slug, c.slug)}
                  >
                    <MapPin aria-hidden className="size-3.5 text-brand-600" />
                    {service.navLabel} in {c.cityName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            href="/service-areas/"
          >
            View all service areas <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>

      <CTABanner
        heading={`Ready to schedule your ${svcLower} in ${city.cityName}?`}
        phone={siteSettings.phone}
      />
      <ContactSection siteSettings={siteSettings} />
    </>
  )
}
