import type { MetadataRoute } from 'next'

import { query } from '@/db/client'
import { getCategoriesWithCounts } from '@/lib/posts'
import { listServiceCityCombos } from '@/lib/service-city.server'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * Single sitemap mirroring the legacy WordPress URL set: all published
 * services, cities (incl. pathOverride) and posts plus the static routes and
 * non-empty categories. Read from Postgres at request time.
 *
 * `force-dynamic` + a live query is deliberate. Blog posts are created at
 * runtime through /api/blog/publish (the daily automation), but a sitemap
 * route with no dynamic flag is generated once at build and frozen — so posts
 * published after the last deploy never appeared, even though the publish API
 * called `revalidateTag('sitemap')`, because nothing re-ran the frozen route.
 * Querying the DB per request guarantees a freshly published post shows up
 * with no redeploy and no dependence on tag revalidation. The heavier joins
 * (service×city combos, category counts) keep their own tag-scoped caches.
 */
export const dynamic = 'force-dynamic'

async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = getServerSideURL()
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/services/`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/service-areas/`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about/`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact/`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${base}/blog/`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/privacy-policy/`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms-of-service/`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const docs = await query<{
    slug: string | null
    updated_at: string | null
    path_override: string | null
    collection: string
  }>(`
    SELECT slug, updated_at, NULL::varchar AS path_override, 'services' AS collection
      FROM services WHERE _status = 'published'
    UNION ALL
    SELECT slug, updated_at, path_override, 'cities' FROM cities WHERE _status = 'published'
    UNION ALL
    SELECT slug, updated_at, NULL::varchar, 'posts' FROM posts WHERE _status = 'published'
  `)
  for (const doc of docs) {
    if (!doc.slug || doc.slug === 'home') continue
    const path = doc.path_override || `/${doc.slug}/`
    entries.push({
      url: `${base}${path}`,
      lastModified: doc.updated_at ? new Date(doc.updated_at) : undefined,
      changeFrequency: doc.collection === 'posts' ? 'monthly' : 'weekly',
      priority: doc.collection === 'posts' ? 0.6 : 0.9,
    })
  }

  // Programmatic service × city landing pages.
  for (const combo of await listServiceCityCombos()) {
    entries.push({
      url: `${base}${combo.path}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const category of await getCategoriesWithCounts()) {
    if (!category.slug || category.slug === 'uncategorized' || category.count === 0) continue
    entries.push({
      url: `${base}/category/${category.slug}/`,
      changeFrequency: 'weekly',
      priority: 0.4,
    })
  }

  return entries
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries()
}
