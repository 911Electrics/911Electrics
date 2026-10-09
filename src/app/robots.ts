import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { getServerSideURL } from '@/utilities/getURL'
import { getCanonicalHost } from '@/utilities/canonicalHost'

// Evaluate per-request so the rules reflect the actual hostname being served,
// not whatever host was current when the route was prerendered at build time.
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const canonical = getCanonicalHost()
  const headerList = await headers()
  const host = (headerList.get('host') || '').replace(/:\d+$/, '')

  // On any non-canonical host (e.g. the *.vercel.app preview/staging domain)
  // block all crawling so it can't be indexed alongside the real site.
  if (canonical && host && host !== canonical) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio', '/api/'],
    },
    sitemap: `${getServerSideURL()}/sitemap.xml`,
  }
}
