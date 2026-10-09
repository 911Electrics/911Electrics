import 'server-only'

import { query } from '@/db/client'

export type CityListItem = {
  id: number
  cityName: string
  slug: string | null
  pathOverride: string | null
  status: string
}

export type CityFaq = { question: string; answer: unknown }

export type StudioCity = {
  id: number
  cityName: string
  region: string
  title: string
  heroHeadingOverride: string
  introOverride: unknown
  localNotes: unknown
  metaTitle: string
  metaDescription: string
  metaImageId: number | null
  pathOverride: string
  slug: string
  status: 'draft' | 'published'
  neighborhoods: string[]
  zipCodes: string[]
  faqsOverride: CityFaq[]
}

export async function getAllCities(): Promise<CityListItem[]> {
  const rows = await query<{
    id: number
    city_name: string | null
    slug: string | null
    path_override: string | null
    _status: string | null
  }>(`SELECT id, city_name, slug, path_override, _status FROM cities ORDER BY city_name`)
  return rows.map((r) => ({
    id: r.id,
    cityName: r.city_name ?? '(unnamed)',
    slug: r.slug,
    pathOverride: r.path_override,
    status: r._status ?? 'draft',
  }))
}

export async function getCityById(id: number): Promise<StudioCity | null> {
  const rows = await query<{
    id: number
    city_name: string | null
    region: string | null
    title: string | null
    hero_heading_override: string | null
    intro_override: unknown
    local_notes: unknown
    meta_title: string | null
    meta_description: string | null
    meta_image_id: number | null
    path_override: string | null
    slug: string | null
    _status: string | null
  }>(
    `SELECT id, city_name, region, title, hero_heading_override, intro_override, local_notes,
            meta_title, meta_description, meta_image_id, path_override, slug, _status
     FROM cities WHERE id = $1 LIMIT 1`,
    [id],
  )
  const c = rows[0]
  if (!c) return null

  const [neighborhoods, zips, faqs] = await Promise.all([
    query<{ name: string | null }>(
      `SELECT name FROM cities_neighborhoods WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
    query<{ zip: string | null }>(
      `SELECT zip FROM cities_zip_codes WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
    query<{ question: string | null; answer: unknown }>(
      `SELECT question, answer FROM cities_faqs_override WHERE _parent_id = $1 ORDER BY _order`,
      [id],
    ),
  ])

  return {
    id: c.id,
    cityName: c.city_name ?? '',
    region: c.region ?? '',
    title: c.title ?? '',
    heroHeadingOverride: c.hero_heading_override ?? '',
    introOverride: c.intro_override,
    localNotes: c.local_notes,
    metaTitle: c.meta_title ?? '',
    metaDescription: c.meta_description ?? '',
    metaImageId: c.meta_image_id,
    pathOverride: c.path_override ?? '',
    slug: c.slug ?? '',
    status: c._status === 'published' ? 'published' : 'draft',
    neighborhoods: neighborhoods.map((n) => n.name ?? '').filter(Boolean),
    zipCodes: zips.map((z) => z.zip ?? '').filter(Boolean),
    faqsOverride: faqs.map((f) => ({ question: f.question ?? '', answer: f.answer })),
  }
}
