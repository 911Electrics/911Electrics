import 'server-only'

import { unstable_cache } from 'next/cache'

import { query } from '@/db/client'
import { getMediaByIds } from '@/db/queries'
import type { MediaImage, RichTextData } from '@/db/types'

export type ServiceDetail = {
  id: number
  title: string
  navLabel: string
  slug: string
  shortDescription: string | null
  heroSubheading: string | null
  heroImage: MediaImage | null
  showRatingBadge: boolean
  intro: RichTextData | null
  meta: { title: string | null; description: string | null; image: MediaImage | null }
  benefits: { title: string; text: string }[]
  features: { title: string; text: string }[]
  faqs: { question: string; answer: RichTextData }[]
  gallery: { id: string; image: MediaImage }[]
}

export const getServiceBySlug = unstable_cache(
  async (slug: string): Promise<ServiceDetail | null> => {
    const rows = await query<{
      id: number
      title: string | null
      nav_label: string | null
      slug: string | null
      short_description: string | null
      hero_subheading: string | null
      hero_image_id: number | null
      show_rating_badge: boolean | null
      intro: RichTextData | null
      meta_title: string | null
      meta_description: string | null
      meta_image_id: number | null
    }>(
      `SELECT id, title, nav_label, slug, short_description, hero_subheading, hero_image_id,
              show_rating_badge, intro, meta_title, meta_description, meta_image_id
       FROM services WHERE slug = $1 AND _status = 'published' LIMIT 1`,
      [slug],
    )
    const s = rows[0]
    if (!s) return null

    const [benefits, features, faqs, gallery] = await Promise.all([
      query<{ title: string | null; text: string | null }>(
        `SELECT title, text FROM services_benefits WHERE _parent_id = $1 ORDER BY _order`,
        [s.id],
      ),
      query<{ title: string | null; text: string | null }>(
        `SELECT title, text FROM services_features WHERE _parent_id = $1 ORDER BY _order`,
        [s.id],
      ),
      query<{ question: string | null; answer: RichTextData | null }>(
        `SELECT question, answer FROM services_faqs WHERE _parent_id = $1 ORDER BY _order`,
        [s.id],
      ),
      query<{ id: string; image_id: number | null }>(
        `SELECT id, image_id FROM services_gallery WHERE _parent_id = $1 ORDER BY _order`,
        [s.id],
      ),
    ])

    const mediaIds = [s.hero_image_id, s.meta_image_id, ...gallery.map((g) => g.image_id)].filter(
      (n): n is number => typeof n === 'number',
    )
    const media = await getMediaByIds(mediaIds)

    return {
      id: s.id,
      title: s.title ?? '',
      navLabel: s.nav_label ?? s.title ?? '',
      slug: s.slug ?? '',
      shortDescription: s.short_description,
      heroSubheading: s.hero_subheading,
      heroImage: s.hero_image_id ? (media.get(s.hero_image_id) ?? null) : null,
      showRatingBadge: Boolean(s.show_rating_badge),
      intro: s.intro,
      meta: {
        title: s.meta_title,
        description: s.meta_description,
        image: s.meta_image_id ? (media.get(s.meta_image_id) ?? null) : null,
      },
      benefits: benefits.map((b) => ({ title: b.title ?? '', text: b.text ?? '' })),
      features: features.map((f) => ({ title: f.title ?? '', text: f.text ?? '' })),
      faqs: faqs
        .filter((f) => f.answer)
        .map((f) => ({ question: f.question ?? '', answer: f.answer as RichTextData })),
      gallery: gallery
        .map((g) => ({ id: g.id, image: g.image_id ? media.get(g.image_id) : undefined }))
        .filter((g): g is { id: string; image: MediaImage } => !!g.image),
    }
  },
  ['db-service-by-slug'],
  { tags: ['services'] },
)
