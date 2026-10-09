import 'server-only'

import { unstable_cache } from 'next/cache'

import { query } from './client'
import type {
  Category,
  CityNav,
  CityPageTemplate,
  Homepage,
  MediaImage,
  RichTextData,
  ServiceNav,
  SiteSettings,
  SocialLink,
  Testimonial,
} from './types'

/**
 * Payload-free read helpers. Each query is validated directly against the
 * Supabase schema. Results are wrapped in `unstable_cache` with the same tags
 * the Payload hooks already revalidate, so existing cache invalidation keeps
 * working as read paths migrate over.
 */

type MediaRow = {
  id: number
  alt: string | null
  url: string | null
  filename: string | null
  width: string | number | null
  height: string | number | null
  sizes_thumbnail_filename: string | null
  sizes_square_filename: string | null
  sizes_small_filename: string | null
  sizes_medium_filename: string | null
  sizes_large_filename: string | null
  sizes_xlarge_filename: string | null
  sizes_og_filename: string | null
}

const num = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v)

/**
 * Original Payload media is served as static assets from /public/media, so we
 * build /media/<filename> from the filename columns (the stored `url` pointed at
 * Payload's removed /api/media/file/* route). Media uploaded via Studio lives on
 * Vercel Blob — those rows store an absolute `url`, which we use directly.
 */
const mediaPath = (filename: string | null): string | null =>
  filename ? `/media/${filename}` : null

const isAbsolute = (u: string | null): u is string => !!u && /^https?:\/\//i.test(u)

export function mapMedia(row: MediaRow): MediaImage {
  if (isAbsolute(row.url)) {
    const url = row.url
    return {
      id: row.id,
      alt: row.alt,
      url,
      width: num(row.width),
      height: num(row.height),
      // Blob uploads have no pre-generated variants; next/image resizes the original.
      sizes: { thumbnail: url, square: url, small: url, medium: url, large: url, xlarge: url, og: url },
    }
  }
  return {
    id: row.id,
    alt: row.alt,
    url: mediaPath(row.filename) ?? '',
    width: num(row.width),
    height: num(row.height),
    sizes: {
      thumbnail: mediaPath(row.sizes_thumbnail_filename),
      square: mediaPath(row.sizes_square_filename),
      small: mediaPath(row.sizes_small_filename),
      medium: mediaPath(row.sizes_medium_filename),
      large: mediaPath(row.sizes_large_filename),
      xlarge: mediaPath(row.sizes_xlarge_filename),
      og: mediaPath(row.sizes_og_filename),
    },
  }
}

const MEDIA_COLUMNS = `
  id, alt, url, filename, width, height,
  sizes_thumbnail_filename, sizes_square_filename, sizes_small_filename,
  sizes_medium_filename, sizes_large_filename, sizes_xlarge_filename, sizes_og_filename
`

/** Fetch media rows by id, returned as a Map for easy joining. */
export async function getMediaByIds(ids: number[]): Promise<Map<number, MediaImage>> {
  const unique = [...new Set(ids.filter((n): n is number => typeof n === 'number'))]
  if (unique.length === 0) return new Map()
  const rows = await query<MediaRow>(
    `SELECT ${MEDIA_COLUMNS} FROM media WHERE id = ANY($1)`,
    [unique],
  )
  return new Map(rows.map((r) => [r.id, mapMedia(r)]))
}

export const getAllCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return query<Category>(`SELECT id, title, slug FROM categories ORDER BY title`)
  },
  ['db-categories'],
  { tags: ['categories'] },
)

export const getServicesNav = unstable_cache(
  async (): Promise<ServiceNav[]> => {
    const rows = await query<{
      id: number
      title: string | null
      nav_label: string | null
      slug: string | null
      short_description: string | null
      display_order: string | number | null
      card_image_id: number | null
    }>(`
      SELECT id, title, nav_label, slug, short_description, display_order, card_image_id
      FROM services
      WHERE _status = 'published'
      ORDER BY display_order NULLS LAST, title
    `)
    const media = await getMediaByIds(
      rows.map((r) => r.card_image_id).filter((n): n is number => typeof n === 'number'),
    )
    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      navLabel: r.nav_label ?? r.title ?? '',
      slug: r.slug ?? '',
      shortDescription: r.short_description ?? '',
      displayOrder: num(r.display_order),
      cardImage: r.card_image_id ? (media.get(r.card_image_id) ?? null) : null,
    }))
  },
  ['db-services-nav'],
  { tags: ['services'] },
)

export const getCitiesNav = unstable_cache(
  async (): Promise<CityNav[]> => {
    const rows = await query<{
      id: number
      city_name: string | null
      slug: string | null
      path_override: string | null
    }>(`
      SELECT id, city_name, slug, path_override
      FROM cities
      WHERE _status = 'published'
      ORDER BY city_name
    `)
    return rows.map((r) => ({
      id: r.id,
      cityName: r.city_name ?? '',
      slug: r.slug ?? '',
      pathOverride: r.path_override,
    }))
  },
  ['db-cities-nav'],
  { tags: ['cities'] },
)

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const rows = await query<{
      id: number
      business_name: string | null
      license_number: string | null
      phone: string | null
      email: string | null
      address_street: string | null
      address_city: string | null
      address_state: string | null
      address_zip: string | null
      geo_lat: string | number | null
      geo_lng: string | number | null
      hours_label: string | null
      aggregate_rating_value: string | number | null
      aggregate_rating_count: string | number | null
      logo_id: number | null
      default_o_g_image_id: number | null
    }>(`
      SELECT id, business_name, license_number, phone, email,
             address_street, address_city, address_state, address_zip,
             geo_lat, geo_lng, hours_label,
             aggregate_rating_value, aggregate_rating_count,
             logo_id, default_o_g_image_id
      FROM site_settings
      ORDER BY id
      LIMIT 1
    `)
    const s = rows[0]
    if (!s) throw new Error('site_settings row not found')

    const socials = await query<{ platform: SocialLink['platform']; url: string }>(
      `SELECT platform, url FROM site_settings_socials WHERE _parent_id = $1 ORDER BY _order`,
      [s.id],
    )

    const mediaIds = [s.logo_id, s.default_o_g_image_id].filter(
      (n): n is number => typeof n === 'number',
    )
    const media = await getMediaByIds(mediaIds)

    return {
      id: s.id,
      businessName: s.business_name ?? '',
      licenseNumber: s.license_number ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: {
        street: s.address_street,
        city: s.address_city,
        state: s.address_state,
        zip: s.address_zip,
      },
      geo: {
        lat: num(s.geo_lat),
        lng: num(s.geo_lng),
      },
      hoursLabel: s.hours_label,
      aggregateRating: {
        value: num(s.aggregate_rating_value),
        count: num(s.aggregate_rating_count),
      },
      socials: socials.map((r) => ({ platform: r.platform, url: r.url })),
      logo: s.logo_id ? (media.get(s.logo_id) ?? null) : null,
      defaultOGImage: s.default_o_g_image_id ? (media.get(s.default_o_g_image_id) ?? null) : null,
    }
  },
  ['db-site-settings'],
  { tags: ['global_siteSettings'] },
)

export const getCityPageTemplate = unstable_cache(
  async (): Promise<CityPageTemplate> => {
    const rows = await query<{
      id: number
      hero_heading: string | null
      hero_subheading: string | null
      hero_image_id: number | null
      intro: RichTextData | null
      process_heading: string | null
      services_heading: string | null
      services_intro: string | null
      about_heading: string | null
      about_body: RichTextData | null
      cta_heading: string | null
      cta_body: string | null
    }>(`
      SELECT id, hero_heading, hero_subheading, hero_image_id, intro,
             process_heading, services_heading, services_intro,
             about_heading, about_body, cta_heading, cta_body
      FROM city_page_template
      ORDER BY id
      LIMIT 1
    `)
    const t = rows[0]
    if (!t) throw new Error('city_page_template row not found')

    const [steps, diffs, faqs] = await Promise.all([
      query<{ id: string; title: string | null; text: string | null }>(
        `SELECT id, title, text FROM city_page_template_process_steps WHERE _parent_id = $1 ORDER BY _order`,
        [t.id],
      ),
      query<{ id: string; title: string | null; text: string | null }>(
        `SELECT id, title, text FROM city_page_template_differentiators WHERE _parent_id = $1 ORDER BY _order`,
        [t.id],
      ),
      query<{ id: string; question: string | null; answer: RichTextData | null }>(
        `SELECT id, question, answer FROM city_page_template_faqs WHERE _parent_id = $1 ORDER BY _order`,
        [t.id],
      ),
    ])

    const media = t.hero_image_id ? await getMediaByIds([t.hero_image_id]) : new Map()

    return {
      id: t.id,
      heroHeading: t.hero_heading ?? '',
      heroSubheading: t.hero_subheading,
      heroImage: t.hero_image_id ? (media.get(t.hero_image_id) ?? null) : null,
      intro: t.intro,
      processHeading: t.process_heading,
      processSteps: steps.map((s) => ({ id: s.id, title: s.title ?? '', text: s.text ?? '' })),
      servicesHeading: t.services_heading,
      servicesIntro: t.services_intro,
      aboutHeading: t.about_heading,
      aboutBody: t.about_body,
      differentiators: diffs.map((d) => ({ id: d.id, title: d.title ?? '', text: d.text ?? '' })),
      ctaHeading: t.cta_heading,
      ctaBody: t.cta_body,
      faqs: faqs
        .filter((f) => f.answer)
        .map((f) => ({ id: f.id, question: f.question ?? '', answer: f.answer as RichTextData })),
    }
  },
  ['db-city-page-template'],
  { tags: ['global_cityPageTemplate'] },
)

export const getHomepage = unstable_cache(
  async (): Promise<Homepage> => {
    const rows = await query<{
      id: number
      hero_heading: string | null
      hero_subheading: string | null
      hero_image_id: number | null
      process_heading: string | null
      services_heading: string | null
      services_intro: string | null
      about_heading: string | null
      about_body: RichTextData | null
      about_image_id: number | null
      reviews_heading: string | null
      contact_heading: string | null
      contact_body: string | null
      meta_title: string | null
      meta_description: string | null
      meta_image_id: number | null
    }>(`
      SELECT id, hero_heading, hero_subheading, hero_image_id,
             process_heading, services_heading, services_intro,
             about_heading, about_body, about_image_id,
             reviews_heading, contact_heading, contact_body,
             meta_title, meta_description, meta_image_id
      FROM homepage
      ORDER BY id
      LIMIT 1
    `)
    const h = rows[0]
    if (!h) throw new Error('homepage row not found')

    const [steps, diffs, faqs] = await Promise.all([
      query<{ id: string; title: string | null; text: string | null }>(
        `SELECT id, title, text FROM homepage_process_steps WHERE _parent_id = $1 ORDER BY _order`,
        [h.id],
      ),
      query<{ id: string; title: string | null; text: string | null }>(
        `SELECT id, title, text FROM homepage_differentiators WHERE _parent_id = $1 ORDER BY _order`,
        [h.id],
      ),
      query<{ id: string; question: string | null; answer: RichTextData | null }>(
        `SELECT id, question, answer FROM homepage_faqs WHERE _parent_id = $1 ORDER BY _order`,
        [h.id],
      ),
    ])

    const mediaIds = [h.hero_image_id, h.about_image_id, h.meta_image_id].filter(
      (n): n is number => typeof n === 'number',
    )
    const media = await getMediaByIds(mediaIds)

    return {
      id: h.id,
      heroHeading: h.hero_heading ?? '',
      heroSubheading: h.hero_subheading,
      heroImage: h.hero_image_id ? (media.get(h.hero_image_id) ?? null) : null,
      processHeading: h.process_heading,
      processSteps: steps.map((s) => ({ id: s.id, title: s.title ?? '', text: s.text ?? '' })),
      servicesHeading: h.services_heading,
      servicesIntro: h.services_intro,
      aboutHeading: h.about_heading,
      aboutBody: h.about_body,
      aboutImage: h.about_image_id ? (media.get(h.about_image_id) ?? null) : null,
      differentiators: diffs.map((d) => ({ id: d.id, title: d.title ?? '', text: d.text ?? '' })),
      reviewsHeading: h.reviews_heading,
      contactHeading: h.contact_heading,
      contactBody: h.contact_body,
      faqs: faqs
        .filter((f) => f.answer)
        .map((f) => ({ id: f.id, question: f.question ?? '', answer: f.answer as RichTextData })),
      meta: {
        title: h.meta_title,
        description: h.meta_description,
        image: h.meta_image_id ? (media.get(h.meta_image_id) ?? null) : null,
      },
    }
  },
  ['db-homepage'],
  { tags: ['global_homepage'] },
)

export const getFeaturedTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    const rows = await query<{
      id: number
      author_name: string | null
      location: string | null
      rating: string | number | null
      text: string | null
      source: string | null
      date: string | null
      featured: boolean | null
    }>(`
      SELECT id, author_name, location, rating, text, source, date, featured
      FROM testimonials
      WHERE featured = true
      ORDER BY date DESC NULLS LAST
      LIMIT 12
    `)
    return rows.map((r) => ({
      id: r.id,
      authorName: r.author_name ?? '',
      location: r.location,
      rating: num(r.rating) ?? 0,
      text: r.text ?? '',
      source: r.source,
      date: r.date,
      featured: Boolean(r.featured),
    }))
  },
  ['db-featured-testimonials'],
  { tags: ['testimonials'] },
)
