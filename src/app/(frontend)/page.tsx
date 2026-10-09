import type { Metadata } from 'next'

import React from 'react'

import { AboutSection } from '@/components/sections/AboutSection'
import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { FAQAccordion } from '@/components/sections/FAQAccordion'
import { Hero } from '@/components/sections/Hero'
import { ProcessSteps } from '@/components/sections/ProcessSteps'
import { ServiceCards } from '@/components/sections/ServiceCards'
import { TestimonialCarousel } from '@/components/sections/TestimonialCarousel'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  getCitiesNav,
  getFeaturedTestimonials,
  getHomepage,
  getServicesNav,
  getSiteSettings,
} from '@/lib/queries'
import { electricianSchema, faqSchema, jsonLdGraph, lexicalToPlainText } from '@/lib/schema-org'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

export default async function HomePage() {
  const [homepage, siteSettings, services, testimonials, cities] = await Promise.all([
    getHomepage(),
    getSiteSettings(),
    getServicesNav(),
    getFeaturedTestimonials(),
    getCitiesNav(),
  ])

  const json = jsonLdGraph(
    electricianSchema(siteSettings, { areaServed: cities.map((c) => c.cityName) }),
    faqSchema(
      (homepage.faqs ?? []).map((f) => ({
        question: f.question,
        answerText: lexicalToPlainText(f.answer),
      })),
    ),
  )

  return (
    <>
      <JsonLd json={json} />
      <Hero
        heading={homepage.heroHeading}
        image={homepage.heroImage}
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        rating={siteSettings.aggregateRating}
        subheading={homepage.heroSubheading}
      />
      <ProcessSteps heading={homepage.processHeading} steps={homepage.processSteps} />
      <ServiceCards
        heading={homepage.servicesHeading}
        intro={homepage.servicesIntro}
        services={services}
      />
      <AboutSection
        body={homepage.aboutBody}
        differentiators={homepage.differentiators}
        heading={homepage.aboutHeading}
        image={homepage.aboutImage}
      />
      <TestimonialCarousel heading={homepage.reviewsHeading} testimonials={testimonials} />
      <FAQAccordion faqs={homepage.faqs ?? null} />
      <CTABanner phone={siteSettings.phone} />
      <ContactSection
        body={homepage.contactBody}
        heading={homepage.contactHeading}
        siteSettings={siteSettings}
      />
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getHomepage()
  const base = getServerSideURL()
  const ogPath = meta.image?.sizes.og ?? meta.image?.url
  const title = meta.title || '911 Construction & Electric Inc.'
  return {
    title,
    description: meta.description ?? undefined,
    alternates: { canonical: '/' },
    openGraph: mergeOpenGraph({
      description: meta.description ?? '',
      images: ogPath ? [{ url: base + ogPath }] : undefined,
      title,
      url: '/',
    }),
  }
}
