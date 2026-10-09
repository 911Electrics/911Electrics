import 'server-only'

import { unstable_cache } from 'next/cache'

import { query } from '@/db/client'
import { getMediaByIds } from '@/db/queries'
import type { MediaImage, RichTextData } from '@/db/types'

export type CityDetail = {
  id: number
  cityName: string
  region: string | null
  slug: string
  pathOverride: string | null
  heroHeadingOverride: string | null
  introOverride: RichTextData | null
  localNotes: RichTextData | null
  neighborhoods: { id: string; name: string }[]
  faqsOverride: { question: string; answer: RichTextData }[]
  meta: { title: string | null; description: string | null; image: MediaImage | null }
}

type CityRow = {
  id: number
  city_name: string | null
  region: string | null
  slug: string | null
  path_override: string | null
  hero_heading_override: string | null
  intro_override: RichTextData | null
  local_notes: RichTextData | null
  meta_title: string | null
  meta_description: string | null
  meta_image_id: number | null
}

async function hydrate(c: CityRow): Promise<CityDetail> {
  const [neighborhoods, faqs, media] = await Promise.all([
    query<{ id: string; name: string | null }>(
      `SELECT id, name FROM cities_neighborhoods WHERE _parent_id = $1 ORDER BY _order`,
      [c.id],
    ),
    query<{ question: string | null; answer: RichTextData | null }>(
      `SELECT question, answer FROM cities_faqs_override WHERE _parent_id = $1 ORDER BY _order`,
      [c.id],
    ),
    c.meta_image_id ? getMediaByIds([c.meta_image_id]) : Promise.resolve(new Map<number, MediaImage>()),
  ])
  return {
    id: c.id,
    cityName: c.city_name ?? '',
    region: c.region,
    slug: c.slug ?? '',
    pathOverride: c.path_override,
    heroHeadingOverride: c.hero_heading_override,
    introOverride: c.intro_override,
    localNotes: c.local_notes,
    neighborhoods: neighborhoods.map((n) => ({ id: n.id, name: n.name ?? '' })),
    faqsOverride: faqs
      .filter((f) => f.answer)
      .map((f) => ({ question: f.question ?? '', answer: f.answer as RichTextData })),
    meta: {
      title: c.meta_title,
      description: c.meta_description,
      image: c.meta_image_id ? (media.get(c.meta_image_id) ?? null) : null,
    },
  }
}

const SELECT = `SELECT id, city_name, region, slug, path_override, hero_heading_override,
                       intro_override, local_notes, meta_title, meta_description, meta_image_id
                FROM cities`

export const getCityBySlug = unstable_cache(
  async (slug: string): Promise<CityDetail | null> => {
    const rows = await query<CityRow>(`${SELECT} WHERE slug = $1 AND _status = 'published' LIMIT 1`, [slug])
    return rows[0] ? hydrate(rows[0]) : null
  },
  ['db-city-by-slug'],
  { tags: ['cities'] },
)

export const getCityByPath = unstable_cache(
  async (pathOverride: string): Promise<CityDetail | null> => {
    const rows = await query<CityRow>(
      `${SELECT} WHERE path_override = $1 AND _status = 'published' LIMIT 1`,
      [pathOverride],
    )
    return rows[0] ? hydrate(rows[0]) : null
  },
  ['db-city-by-path'],
  { tags: ['cities'] },
)
