import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

import { authorize } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Flush the content Data Cache. Direct database edits (e.g. via SQL/Studio
 * tooling outside the app) don't trigger `revalidateTag`, so cached query
 * results can go stale until something writes through the app. Hitting this
 * endpoint forces a refresh of the public content.
 *
 *   POST /api/revalidate                      → revalidate all content tags
 *   POST /api/revalidate  { "tags": ["cities"] } → revalidate only those tags
 */
const ALL_TAGS = [
  'cities',
  'services',
  'posts',
  'categories',
  'testimonials',
  'sitemap',
  'global_siteSettings',
  'global_cityPageTemplate',
  'global_homepage',
] as const

export async function POST(req: Request) {
  const auth = await authorize(req, 'cache:write')
  if (!auth.ok) return auth.response

  let requested: string[] | null = null
  try {
    const body = (await req.json()) as { tags?: unknown }
    if (Array.isArray(body?.tags)) {
      requested = body.tags.map((t) => String(t)).filter((t) => (ALL_TAGS as readonly string[]).includes(t))
    }
  } catch {
    // No/!invalid body → revalidate everything.
  }

  const tags = requested && requested.length ? requested : [...ALL_TAGS]
  for (const tag of tags) revalidateTag(tag, 'max')

  return NextResponse.json({ revalidated: true, tags })
}
