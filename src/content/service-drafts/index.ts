import 'server-only'

import type { RichTextData, ServiceNav } from '@/db/types'
import { getMediaByIds } from '@/db/queries'
import { markdownToLexical } from '@/lib/markdown-to-lexical'
import type { ServiceDetail } from '@/lib/services'

import drafts from './drafts.json'

/**
 * Code-managed service page copy (drafted 2026-11-08 for Haik's review; go-live
 * approved by Haik 2026-11-09 9:02 PM PT, "Publish").
 *
 * Mapped into the SAME ServicePage template slots the DB feeds (intro, "Why Choose Us"
 * features, "What You Get" benefits, FAQs, hub card text), plus 2 new service pages
 * (/backup-power-los-angeles-ca/, /house-rewiring-los-angeles-ca/). Title, H1, hero
 * subheading, hero image, meta title/description and URL of the existing pages are NOT
 * overridden. New pages appear as hub cards only (not header nav, footer or sitemap).
 * No DB writes; rolls back with a deploy/revert.
 */
export const SERVICE_DRAFTS_ENABLED = true

type DraftService = {
  new?: boolean
  id?: number
  displayOrder?: number
  heroImageId?: number
  cardImageId?: number
  showRatingBadge?: boolean
  title?: string
  navLabel?: string
  metaTitle?: string
  metaDescription?: string
  heroSubheading?: string
  shortDescription: string
  intro: string
  features: { title: string; text: string }[]
  benefits: { title: string; text: string }[]
  faqs: { question: string; answer: string }[]
}

const DATA = drafts as unknown as {
  hubHeader: string
  cards: Record<string, string>
  services: Record<string, DraftService>
}

const toRich = (md: string): RichTextData => markdownToLexical(md)

/** Swap draft copy into a service. Returns `base` untouched otherwise. */
export async function applyServiceDraft(
  slug: string,
  base: ServiceDetail | null,
): Promise<ServiceDetail | null> {
  if (!SERVICE_DRAFTS_ENABLED) return base
  const d = DATA.services[slug]
  if (!d) return base

  const content = {
    shortDescription: d.shortDescription,
    intro: toRich(d.intro),
    features: d.features,
    benefits: d.benefits,
    faqs: d.faqs.map((f) => ({ question: f.question, answer: toRich(f.answer) })),
  }

  if (base) return { ...base, ...content }
  if (!d.new) return null

  const media = await getMediaByIds([d.heroImageId, d.cardImageId].filter((n): n is number => !!n))
  const hero = d.heroImageId ? (media.get(d.heroImageId) ?? null) : null
  return {
    id: d.id ?? -1,
    title: d.title ?? '',
    navLabel: d.navLabel ?? d.title ?? '',
    slug,
    heroSubheading: d.heroSubheading ?? null,
    heroImage: hero,
    showRatingBadge: d.showRatingBadge ?? true,
    meta: { title: d.metaTitle ?? null, description: d.metaDescription ?? null, image: hero },
    gallery: [],
    ...content,
  }
}

/** Hub (/services/) header paragraph override. */
export function getServicesHubHeader(fallback: string): string {
  return SERVICE_DRAFTS_ENABLED ? DATA.hubHeader : fallback
}

/** Hub cards: richer card text + the 2 new services. */
export async function applyServicesHubDrafts(services: ServiceNav[]): Promise<ServiceNav[]> {
  if (!SERVICE_DRAFTS_ENABLED) return services
  const existing = services.map((s) =>
    DATA.cards[s.slug] ? { ...s, shortDescription: DATA.cards[s.slug] } : s,
  )
  const known = new Set(services.map((s) => s.slug))
  const extra = Object.entries(DATA.services).filter(([slug, d]) => d.new && !known.has(slug))
  const media = await getMediaByIds(
    extra.map(([, d]) => d.cardImageId).filter((n): n is number => !!n),
  )
  const added: ServiceNav[] = extra.map(([slug, d]) => ({
    id: d.id ?? -1,
    title: d.title ?? '',
    navLabel: d.navLabel ?? d.title ?? '',
    slug,
    shortDescription: d.shortDescription,
    displayOrder: d.displayOrder ?? null,
    cardImage: d.cardImageId ? (media.get(d.cardImageId) ?? null) : null,
  }))
  return [...existing, ...added].sort(
    (a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER),
  )
}
