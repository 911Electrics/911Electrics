import React from 'react'

import type { ImageLike, SiteSettings } from '@/db/types'
import type { PreviewOverride } from '@/content/preview-overrides'

import { CTABanner } from '@/components/sections/CTABanner'
import { FAQAccordion } from '@/components/sections/FAQAccordion'
import { Hero } from '@/components/sections/Hero'
import { LocalBlocks } from '@/components/sections/LocalBlocks'
import { PhotoGrid } from '@/components/sections/PhotoGrid'
import { ReviewsBlock } from '@/components/sections/ReviewsBlock'
import { TrustStrip } from '@/components/sections/TrustStrip'
import { JsonLd } from '@/components/seo/JsonLd'

/**
 * Compact layout used ONLY for preview-override pages (see content/preview-overrides):
 * hero (+ quote form + call CTA) → trust strip → photos → reviews → local blocks →
 * internal links (`links`) → FAQ → final CTA.
 */
export function PreviewCompactPage({
  preview,
  siteSettings,
  breadcrumbs,
  heroImage,
  rating,
  defaultService,
  json,
  faqHeading,
  localHeading,
  ctaHeading,
  links,
}: {
  preview: PreviewOverride
  siteSettings: SiteSettings
  breadcrumbs: { name: string; path: string }[]
  heroImage?: ImageLike | number | null
  rating?: { value?: number | null; count?: number | null } | null
  defaultService?: string
  /** Full JSON-LD graph string (built by the caller with the preview FAQs). */
  json: string
  faqHeading: string
  localHeading: string
  ctaHeading: string
  links?: React.ReactNode
}) {
  return (
    <>
      <JsonLd json={json} />
      <Hero
        breadcrumbs={breadcrumbs}
        defaultService={defaultService}
        heading={preview.heroHeading}
        image={heroImage}
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        rating={rating}
        subheading={preview.heroSubheading}
      />
      <TrustStrip
        licenseNumber={siteSettings.licenseNumber}
        phone={siteSettings.phone}
        promise={preview.trustPromise}
      />
      <PhotoGrid heading="Recent work by our crew" photos={preview.photos} />
      <ReviewsBlock reviews={preview.reviews} />
      <LocalBlocks blocks={preview.blocks} heading={localHeading} />
      {links}
      <FAQAccordion faqs={preview.faqs} heading={faqHeading} />
      <CTABanner heading={ctaHeading} phone={siteSettings.phone} />
    </>
  )
}
