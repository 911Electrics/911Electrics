/**
 * Opt-in live check of the SEO cleanup redirects against a deployment:
 *   SEO_LIVE_BASE_URL=https://911electrics.com pnpm vitest run tests/int/seo-cleanup-live.int.spec.ts
 * Skipped in CI (no env var). Verifies every source answers a single 301 to its
 * destination and every destination answers 200 without redirecting.
 */
import { describe, expect, it } from 'vitest'

import { cleanupRedirects, LEGACY_REDIRECTS } from '@/lib/seo-cleanup'

const BASE = process.env.SEO_LIVE_BASE_URL

describe.skipIf(!BASE)('SEO cleanup redirects (live)', () => {
  const pairs = [
    ...cleanupRedirects().map((r) => [r.source, r.destination] as const),
    ...LEGACY_REDIRECTS.map((r) => [r.source, r.destination] as const),
  ]

  it('every destination returns 200 with no redirect', async () => {
    for (const d of new Set(pairs.map(([, d]) => d))) {
      const res = await fetch(`${BASE}${d}`, { redirect: 'manual' })
      expect(res.status, d).toBe(200)
    }
  }, 120_000)

  it('every source returns one 301 to its destination', async () => {
    for (const [s, d] of pairs) {
      const res = await fetch(`${BASE}${s}`, { redirect: 'manual' })
      expect(res.status, s).toBe(301)
      expect(new URL(res.headers.get('location') ?? '', BASE).pathname, s).toBe(d)
    }
  }, 180_000)
})
