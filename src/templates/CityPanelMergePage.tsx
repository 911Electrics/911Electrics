import React from 'react'

import type { SiteSettings } from '@/db/types'
import type { PostDetail } from '@/lib/posts'

import { getCityPanelMerge } from '@/content/city-panel-merge'
import {
  breadcrumbSchema,
  electricianSchema,
  faqSchema,
  jsonLdGraph,
  lexicalToPlainText,
} from '@/lib/schema-org'
import { PreviewCompactPage } from '@/templates/PreviewCompactPage'

/**
 * PREVIEW ONLY: merged city panel-upgrade page in the compact city layout
 * (see content/city-panel-merge). Returns null when no draft applies.
 */
export function CityPanelMergePage({
  post,
  siteSettings,
}: {
  post: PostDetail
  siteSettings: SiteSettings
}) {
  const path = `/${post.slug}/`
  const merge = getCityPanelMerge(path)
  if (!merge) return null
  const { city, hubPath, draft } = merge
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Service Areas', path: '/service-areas/' },
    { name: city, path: hubPath },
    { name: 'Panel Upgrades', path },
  ]
  const json = jsonLdGraph(
    electricianSchema(siteSettings, { areaServed: [city], pagePath: path }),
    faqSchema(
      draft.faqs.map((f) => ({
        question: f.question,
        answerText: lexicalToPlainText(f.answer).replace(/\s+([.,;:!?])/g, '$1'),
      })),
    ),
    breadcrumbSchema(crumbs),
  )
  return (
    <PreviewCompactPage
      breadcrumbs={crumbs}
      ctaHeading={`Need a panel upgrade in ${city}? Call us 24/7`}
      defaultService="Electrical Panel Upgrades"
      faqHeading={`Panel upgrades in ${city}: FAQs`}
      heroImage={post.heroImage}
      json={json}
      localHeading={`Panel upgrades in ${city}: what to know`}
      preview={{
        ...draft,
        layout: 'compact',
        metaTitle: '',
        metaDescription: '',
        heroHeading: post.title,
        trustPromise: null,
      }}
      rating={siteSettings.aggregateRating}
      siteSettings={siteSettings}
    />
  )
}
