import { MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type {
  CityPageTemplate,
  ServiceNav,
  SiteSettings,
  Testimonial as DbTestimonial,
} from '@/db/types'
import type { CityDetail } from '@/lib/cities'
import type { PostSummary } from '@/lib/posts'

import { PostCard } from '@/components/PostCard'
import RichText from '@/components/RichText'
import { AboutSection } from '@/components/sections/AboutSection'
import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { FAQAccordion, type FAQ } from '@/components/sections/FAQAccordion'
import { Hero } from '@/components/sections/Hero'
import { ProcessSteps } from '@/components/sections/ProcessSteps'
import { ServiceCards } from '@/components/sections/ServiceCards'
import { TestimonialCarousel } from '@/components/sections/TestimonialCarousel'
import { JsonLd } from '@/components/seo/JsonLd'
import { interpolateDeep, interpolateString, type CityTokens } from '@/lib/interpolate'
import { isEligibleCity, serviceCityPath } from '@/lib/service-city'
import {
  breadcrumbSchema,
  electricianSchema,
  faqSchema,
  jsonLdGraph,
  lexicalToPlainText,
} from '@/lib/schema-org'

/**
 * City pages render from the shared template global; any populated
 * override field on the city doc wins over the template section.
 */
export function CityPage({
  city,
  template,
  services,
  siteSettings,
  testimonials,
  posts = [],
}: {
  city: CityDetail
  template: CityPageTemplate
  services: ServiceNav[]
  siteSettings: SiteSettings
  testimonials: DbTestimonial[]
  /** Blog articles written about this city (see `getPostsForCity`). */
  posts?: PostSummary[]
}) {
  const tokens: CityTokens = { city: city.cityName, region: city.region ?? undefined }
  const t = <V,>(value: V): V => interpolateDeep(value, tokens)

  const heroHeading = city.heroHeadingOverride || interpolateString(template.heroHeading, tokens)
  const intro = city.introOverride ?? (template.intro ? t(template.intro) : null)
  const faqs = (city.faqsOverride?.length ? city.faqsOverride : t(template.faqs)) as FAQ[] | null

  const pagePath = city.pathOverride || `/${city.slug}/`
  const json = jsonLdGraph(
    electricianSchema(siteSettings, { areaServed: [city.cityName], pagePath }),
    faqSchema(
      (faqs ?? []).map((f) => ({
        question: f.question,
        answerText: lexicalToPlainText(f.answer),
      })),
    ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Service Areas', path: '/service-areas/' },
      { name: `Electrician in ${city.cityName}, CA`, path: pagePath },
    ]),
  )

  return (
    <>
      <JsonLd json={json} />
      <Hero
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Service Areas', path: '/service-areas/' },
          { name: city.cityName, path: pagePath },
        ]}
        heading={heroHeading}
        image={template.heroImage}
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        rating={siteSettings.aggregateRating}
        subheading={template.heroSubheading ? interpolateString(template.heroSubheading, tokens) : null}
      />

      {intro && (
        <section className="py-16">
          <div className="container max-w-4xl">
            <RichText className="max-w-none" data={intro} enableGutter={false} />
          </div>
        </section>
      )}

      <ProcessSteps
        heading={template.processHeading ? interpolateString(template.processHeading, tokens) : null}
        steps={t(template.processSteps)}
      />

      <ServiceCards
        heading={template.servicesHeading ? interpolateString(template.servicesHeading, tokens) : null}
        intro={template.servicesIntro ? interpolateString(template.servicesIntro, tokens) : null}
        services={services}
      />

      {/* Deep links to the per-service landing page for this city. Also gives the
          programmatic service×city pages an inbound internal link (they'd
          otherwise be orphaned — reachable only from the sitemap). */}
      {isEligibleCity(city) && services.length > 0 && (
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
              Electrical Services in {city.cityName}
            </h2>
            <p className="mt-3 text-navy-800">
              Explore our most-requested services for {city.cityName} homes and businesses.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-navy-900 shadow-sm transition hover:text-brand-700"
                    href={serviceCityPath(s.slug, city.slug)}
                  >
                    <MapPin aria-hidden className="size-3.5 text-brand-600" />
                    {s.navLabel} in {city.cityName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <AboutSection
        body={template.aboutBody ? t(template.aboutBody) : null}
        differentiators={t(template.differentiators)}
        heading={template.aboutHeading ? interpolateString(template.aboutHeading, tokens) : null}
      />

      {(city.localNotes || !!city.neighborhoods?.length) && (
        <section className="bg-card py-16">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
              Serving {city.cityName} and Nearby Neighborhoods
            </h2>
            {city.localNotes && (
              <RichText className="mt-5 max-w-none" data={city.localNotes} enableGutter={false} />
            )}
            {!!city.neighborhoods?.length && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {city.neighborhoods.map((n) => (
                  <li
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-navy-900 shadow-sm"
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

      <TestimonialCarousel testimonials={testimonials} />

      {/* Articles about this city. Several of them outrank the city page for
          local queries; linking the two ties that authority to the page built
          to convert it, and gives the page content no other city has. */}
      {posts.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
              Electrical Guides for {city.cityName}
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <FAQAccordion faqs={faqs} heading={`Electrician in ${city.cityName} — FAQs`} />

      <CTABanner
        body={template.ctaBody ? interpolateString(template.ctaBody, tokens) : null}
        heading={template.ctaHeading ? interpolateString(template.ctaHeading, tokens) : null}
        phone={siteSettings.phone}
      />
      <ContactSection siteSettings={siteSettings} />
    </>
  )
}
