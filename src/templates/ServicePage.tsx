import Image from 'next/image'
import React from 'react'

import type { SiteSettings } from '@/db/types'
import type { ServiceDetail } from '@/lib/services'

import RichText from '@/components/RichText'
import { CTABanner } from '@/components/sections/CTABanner'
import { ContactSection } from '@/components/sections/ContactSection'
import { FAQAccordion } from '@/components/sections/FAQAccordion'
import { FeatureBlocks } from '@/components/sections/FeatureBlocks'
import { Hero } from '@/components/sections/Hero'
import { ReviewsBlock } from '@/components/sections/ReviewsBlock'
import { TrustStrip } from '@/components/sections/TrustStrip'
import { JsonLd } from '@/components/seo/JsonLd'
import { getPreviewOverride } from '@/content/preview-overrides'
import {
  breadcrumbSchema,
  electricianSchema,
  faqSchema,
  jsonLdGraph,
  lexicalToPlainText,
  serviceSchema,
} from '@/lib/schema-org'

export function ServicePage({
  service,
  siteSettings,
}: {
  service: ServiceDetail
  siteSettings: SiteSettings
}) {
  // Preview-only draft content (null on production; see content/preview-overrides).
  const preview = getPreviewOverride(`/${service.slug}/`)
  const intro = preview?.intro ?? service.intro
  const faqs = preview?.faqs ?? service.faqs ?? null
  const json = jsonLdGraph(
    electricianSchema(siteSettings, { pagePath: `/${service.slug}/` }),
    serviceSchema(service, siteSettings),
    faqSchema(
      (faqs ?? []).map((f) => ({
        question: f.question,
        answerText: lexicalToPlainText(f.answer),
      })),
    ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services/' },
      { name: service.navLabel, path: `/${service.slug}/` },
    ]),
  )

  return (
    <>
      <JsonLd json={json} />
      <Hero
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services/' },
          { name: service.navLabel, path: `/${service.slug}/` },
        ]}
        defaultService={service.navLabel}
        heading={preview?.heroHeading || service.title}
        image={service.heroImage}
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        rating={service.showRatingBadge ? siteSettings.aggregateRating : null}
        subheading={preview?.heroSubheading ?? service.heroSubheading}
      />

      {preview && (
        <TrustStrip
          licenseNumber={siteSettings.licenseNumber}
          phone={siteSettings.phone}
          promise={preview.trustPromise}
        />
      )}

      {intro && (
        <section className="py-16">
          <div className="container max-w-4xl">
            <RichText className="max-w-none" data={intro} enableGutter={false} />
          </div>
        </section>
      )}

      <FeatureBlocks
        heading={`Why Choose Us for ${service.navLabel}`}
        items={service.features}
        tone="card"
      />

      {!!service.gallery?.length && (
        <section className="py-16">
          <div className="container grid gap-6 sm:grid-cols-2">
            {service.gallery.map((item) => (
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-xl shadow"
                key={item.id}
              >
                <Image
                  alt={item.image.alt || service.navLabel}
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src={item.image.url}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <FeatureBlocks eyebrow="The Benefits" heading="What You Get" items={service.benefits} />

      {preview && <ReviewsBlock reviews={preview.reviews} />}

      <FAQAccordion faqs={faqs} heading={`${service.navLabel} FAQs`} />

      <CTABanner
        heading={`Ready to schedule your ${service.navLabel.toLowerCase()}?`}
        phone={siteSettings.phone}
      />
      <ContactSection siteSettings={siteSettings} />
    </>
  )
}
