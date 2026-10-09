import type { SiteSettings } from '@/db/types'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * JSON-LD builders. The site-wide `Electrician` (LocalBusiness subtype)
 * node is referenced by @id from Service/City/Post nodes.
 */

type JsonLd = Record<string, unknown>

const BUSINESS_ID = '#business'

export function electricianSchema(
  siteSettings: SiteSettings,
  options?: { areaServed?: string[]; pagePath?: string },
): JsonLd {
  const base = getServerSideURL()
  const { address, geo, aggregateRating } = siteSettings

  const mediaURL = (m: SiteSettings['logo']): string | undefined =>
    m && typeof m === 'object' && m.url ? base + m.url : undefined
  const logo = mediaURL(siteSettings.logo) ?? `${base}/logo.png`
  const image = mediaURL(siteSettings.defaultOGImage) ?? mediaURL(siteSettings.logo) ?? `${base}/og-default.jpg`

  const schema: JsonLd = {
    '@type': 'Electrician',
    '@id': `${base}/${BUSINESS_ID}`,
    name: siteSettings.businessName,
    url: base + (options?.pagePath ?? '/'),
    logo,
    image,
    telephone: siteSettings.phone,
    email: siteSettings.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address?.street,
      addressLocality: address?.city,
      addressRegion: address?.state,
      postalCode: address?.zip,
      addressCountry: 'US',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'license',
      name: `California Contractor License #${siteSettings.licenseNumber}`,
    },
    priceRange: '$$',
  }

  if (geo?.lat && geo?.lng) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng }
  }
  if (siteSettings.socials?.length) {
    schema.sameAs = siteSettings.socials.map((s) => s.url)
  }
  if (aggregateRating?.count && aggregateRating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.value,
      reviewCount: aggregateRating.count,
    }
  }
  if (options?.areaServed?.length) {
    schema.areaServed = options.areaServed.map((name) => ({ '@type': 'City', name }))
  }

  return schema
}

type ServiceSchemaInput = {
  navLabel: string
  slug: string
  shortDescription?: string | null
  meta?: { description?: string | null }
}

export function serviceSchema(service: ServiceSchemaInput, _siteSettings: SiteSettings): JsonLd {
  const base = getServerSideURL()
  return {
    '@type': 'Service',
    name: service.navLabel,
    description: service.meta?.description ?? service.shortDescription,
    serviceType: service.navLabel,
    url: `${base}/${service.slug}/`,
    provider: { '@id': `${base}/${BUSINESS_ID}` },
    areaServed: { '@type': 'City', name: 'Los Angeles' },
  }
}

type FAQItem = { question: string; answerText: string }

export function faqSchema(faqs: FAQItem[]): JsonLd | null {
  if (!faqs.length) return null
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answerText },
    })),
  }
}

type BlogPostSchemaInput = {
  title: string
  slug: string
  publishedAt?: string | null
  updatedAt?: string | null
  heroImage?: { url?: string | null } | null
  meta?: { description?: string | null }
}

export function blogPostingSchema(post: BlogPostSchemaInput, siteSettings: SiteSettings): JsonLd {
  const base = getServerSideURL()
  const image = post.heroImage?.url ? base + post.heroImage.url : undefined
  return {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta?.description ?? undefined,
    url: `${base}/${post.slug}/`,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    image,
    author: { '@type': 'Organization', name: siteSettings.businessName },
    publisher: { '@id': `${base}/${BUSINESS_ID}` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${base}/${post.slug}/` },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLd {
  const base = getServerSideURL()
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: base + item.path,
    })),
  }
}

/** Extract plain text from a Lexical editor state (for FAQ answer schema). */
export function lexicalToPlainText(state: unknown): string {
  const out: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const n = node as { text?: string; children?: unknown[] }
    if (typeof n.text === 'string') out.push(n.text)
    if (Array.isArray(n.children)) n.children.forEach(walk)
  }
  walk((state as { root?: unknown })?.root)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

export function jsonLdGraph(...schemas: (JsonLd | null | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas.filter(Boolean),
  })
}
