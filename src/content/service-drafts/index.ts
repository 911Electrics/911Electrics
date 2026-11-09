import 'server-only'

import type { RichTextData, ServiceNav } from '@/db/types'
import { getMediaByIds } from '@/db/queries'
import { markdownToLexical } from '@/lib/markdown-to-lexical'
import type { ServiceDetail } from '@/lib/services'

import drafts from './drafts.json'

/**
 * PREVIEW ONLY (Haik asked for reviewable drafts, Website chat 2026-11-08 t198u/t199u).
 *
 * Code-managed draft copy for the service pages, mapped into the SAME ServicePage
 * template slots the DB feeds today (intro, "Why Choose Us" features, "What You Get"
 * benefits, FAQs, hub card text), plus 3 new service pages. Title, H1, hero subheading,
 * hero image, meta title/description and URL of the existing pages are NOT overridden.
 *
 * Gated to Vercel preview deployments: on production (VERCEL_ENV=production) and in
 * local dev every function here is a no-op, so 911electrics.com keeps rendering the
 * published `services` rows unchanged. No DB writes. Go-live requires a separate,
 * approved change.
 */
export const SERVICE_DRAFTS_ENABLED = process.env.VERCEL_ENV === 'preview'

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

/** Swap draft copy into a service (preview only). Returns `base` untouched otherwise. */
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

/** Hub (/services/) header paragraph override (preview only). */
export function getServicesHubHeader(fallback: string): string {
  return SERVICE_DRAFTS_ENABLED ? DATA.hubHeader : fallback
}

/** Hub cards: richer card text + the 3 new services (preview only). */
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
