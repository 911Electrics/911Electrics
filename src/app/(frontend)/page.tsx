import type { Metadata } from 'next'

import React from 'react'

import { PostCard } from '@/components/PostCard'
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
import { getPublishedPosts } from '@/lib/posts'
import { electricianSchema, faqSchema, jsonLdGraph, lexicalToPlainText } from '@/lib/schema-org'
import { absoluteUrl } from '@/utilities/absoluteUrl'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

export default async function HomePage() {
  const [homepage, siteSettings, services, testimonials, cities, recent] = await Promise.all([
    getHomepage(),
    getSiteSettings(),
    getServicesNav(),
    getFeaturedTestimonials(),
    getCitiesNav(),
    getPublishedPosts({ limit: 3 }),
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
      {/* Newest guides, so fresh articles get a link from the homepage instead
          of only from deep /blog/ pagination. Same card pattern as city pages. */}
      {recent.posts.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">
              Recent Guides from Our Electricians
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recent.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
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
      images: ogPath ? [{ url: absoluteUrl(ogPath, base) }] : undefined,
      title,
      url: '/',
    }),
  }
}
