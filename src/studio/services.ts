import 'server-only'

import { query } from '@/db/client'

export type ServiceListItem = {
  id: number
  title: string
  slug: string | null
  status: string
  displayOrder: number | null
}

export type ServiceTextItem = { title: string; text: string }
export type ServiceFaq = { question: string; answer: unknown }

export type StudioService = {
  id: number
  title: string
  navLabel: string
  slug: string
  heroSubheading: string
  shortDescription: string
  intro: unknown
  cardImageId: number | null
  heroImageId: number | null
  metaImageId: number | null
  metaTitle: string
  metaDescription: string
  displayOrder: number | null
  showRatingBadge: boolean
  status: 'draft' | 'published'
  benefits: ServiceTextItem[]
  features: ServiceTextItem[]
  faqs: ServiceFaq[]
  galleryImageIds: number[]
}

export async function getAllServices(): Promise<ServiceListItem[]> {
  const rows = await query<{
    id: number
    title: string | null
    slug: string | null
    _status: string | null
    display_order: string | number | null
  }>(
    `SELECT id, title, slug, _status, display_order FROM services
     ORDER BY display_order NULLS LAST, title`,
  )
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? '(untitled)',
    slug: r.slug,
    status: r._status ?? 'draft',
    displayOrder: r.display_order === null ? null : Number(r.display_order),
  }))
}

export async function getServiceById(id: number): Promise<StudioService | null> {
  const rows = await query<{
    id: number
    title: string | null
    nav_label: string | null
    slug: string | null
    hero_subheading: string | null
    short_description: string | null
    intro: unknown
    card_image_id: number | null
    hero_image_id: number | null
    meta_image_id: number | null
    meta_title: string | null
    meta_description: string | null
    display_order: string | number | null
    show_rating_badge: boolean | null
    _status: string | null
  }>(
    `SELECT id, title, nav_label, slug, hero_subheading, short_description, intro,
            card_image_id, hero_image_id, meta_image_id, meta_title, meta_description,
            display_order, show_rating_badge, _status
     FROM services WHERE id = $1 LIMIT 1`,
    [id],
  )
  const s = rows[0]
  if (!s) return null

  const [benefits, features, faqs, gallery] = await Promise.all([
    query<{ title: string | null; text: string | null }>(
      `SELECT title, text FROM services_benefits WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
    query<{ title: string | null; text: string | null }>(
      `SELECT title, text FROM services_features WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
    query<{ question: string | null; answer: unknown }>(
      `SELECT question, answer FROM services_faqs WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
    query<{ image_id: number | null }>(
      `SELECT image_id FROM services_gallery WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
  ])

  return {
    id: s.id,
    title: s.title ?? '',
    navLabel: s.nav_label ?? '',
    slug: s.slug ?? '',
    heroSubheading: s.hero_subheading ?? '',
    shortDescription: s.short_description ?? '',
    intro: s.intro,
    cardImageId: s.card_image_id,
    heroImageId: s.hero_image_id,
    metaImageId: s.meta_image_id,
    metaTitle: s.meta_title ?? '',
    metaDescription: s.meta_description ?? '',
    displayOrder: s.display_order === null ? null : Number(s.display_order),
    showRatingBadge: Boolean(s.show_rating_badge),
    status: s._status === 'published' ? 'published' : 'draft',
    benefits: benefits.map((b) => ({ title: b.title ?? '', text: b.text ?? '' })),
    features: features.map((f) => ({ title: f.title ?? '', text: f.text ?? '' })),
    faqs: faqs.map((f) => ({ question: f.question ?? '', answer: f.answer })),
    galleryImageIds: gallery
      .map((g) => g.image_id)
      .filter((n): n is number => typeof n === 'number'),
  }
}
