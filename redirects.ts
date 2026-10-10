import { Client } from 'pg'
import type { NextConfig } from 'next'

import { cleanupRedirects } from './src/lib/seo-cleanup'

type Redirect = { source: string; destination: string; permanent: boolean }
type Redirect301 = { source: string; destination: string; statusCode: 301 }

/**
 * Infrastructure redirects preserving legacy WordPress URLs.
 */
type HostRedirect = Redirect & { has: { type: 'host'; value: string }[] }

// www -> apex, enforced in code so it holds regardless of DNS/Vercel domain
// settings. Google had both hosts indexed as separate URLs; the canonical tag
// already points at the apex, this makes the 308 actually happen.
const hostRedirect: HostRedirect = {
  source: '/:path*',
  has: [{ type: 'host' as const, value: 'www.911electrics.com' }],
  destination: 'https://911electrics.com/:path*',
  permanent: true,
}

const staticRedirects: (Redirect | HostRedirect)[] = [
  // Yoast sitemap URLs -> the single Next.js sitemap. Covers every Yoast
  // sub-sitemap (page/post/category/geo/author/post_tag-sitemap.xml) plus the
  // index. The `:type-sitemap.xml` pattern never matches the real /sitemap.xml
  // (no leading "<type>-"), so there is no redirect loop.
  ...['/sitemap_index.xml', '/:type-sitemap.xml'].map((source) => ({
    source,
    destination: '/sitemap.xml',
    permanent: true,
  })),

  // Legacy WordPress service taxonomy was nested under /services/electrical/*
  // (e.g. /services/electrical/residential/, /services/electrical/commercial/
  // industrial-electrical-los-angeles-county/). The new site uses flat service
  // slugs, so collapse the whole retired tree to the services hub.
  { source: '/services/electrical', destination: '/services/', permanent: true },
  { source: '/services/electrical/:path*', destination: '/services/', permanent: true },

  // Yoast Local SEO geo-data file (no equivalent on the new site).
  { source: '/locations.kml', destination: '/service-areas/', permanent: true },

  // WordPress leftovers
  { source: '/category/uncategorized', destination: '/blog/', permanent: true },
  { source: '/feed', destination: '/blog/', permanent: true },
  { source: '/comments/feed', destination: '/blog/', permanent: true },
  { source: '/wp-admin', destination: '/studio/', permanent: false },
  { source: '/wp-admin/:path*', destination: '/studio/', permanent: false },
  { source: '/author/:author', destination: '/blog/', permanent: true },
]

/**
 * Editor-managed redirects from the url_redirects table (Studio → Redirects).
 * Read at build time; best-effort so a build without DB access still succeeds.
 * New/changed entries take effect on the next deploy.
 */
async function dbRedirects(): Promise<Redirect[]> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return []
  const client = new Client({ connectionString, connectionTimeoutMillis: 8000 })
  try {
    await client.connect()
    const { rows } = await client.query<{
      source: string
      destination: string
      permanent: boolean
    }>(`SELECT source, destination, permanent FROM url_redirects`)
    return rows.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: r.permanent,
    }))
  } catch {
    return []
  } finally {
    await client.end().catch(() => {})
  }
}

export const redirects: NextConfig['redirects'] = async () => {
  const fromDb = await dbRedirects()
  // SEO cleanup 301s (src/lib/seo-cleanup.ts) come right after the host redirect so
  // their specific /services/electrical/... sources beat the catch-all below.
  const cleanup: Redirect301[] = cleanupRedirects()
  // Code-defined redirects win over any conflicting managed (DB) source, with or
  // without the trailing slash.
  const codeSources = new Set(
    [...staticRedirects, ...cleanup].flatMap((r) => [r.source, r.source.replace(/\/$/, '')]),
  )
  return [
    hostRedirect,
    ...cleanup,
    ...staticRedirects,
    ...fromDb.filter((r) => !codeSources.has(r.source) && !codeSources.has(`${r.source}/`)),
  ]
}
