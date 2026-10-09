/**
 * The site's canonical hostname (no protocol, no port) — the one real domain
 * the site should be indexed under. Everything else (preview deploys, the
 * project's *.vercel.app domain) should be treated as non-canonical and
 * blocked from indexing.
 *
 * Precedence mirrors getServerSideURL so the canonical host always matches the
 * domain used for the sitemap and SEO URLs:
 *   1. CANONICAL_DOMAIN          — explicit override, if ever needed
 *   2. NEXT_PUBLIC_SERVER_URL    — the canonical site URL (what the site uses)
 *   3. VERCEL_PROJECT_PRODUCTION_URL — Vercel's production domain fallback
 *
 * NOTE: VERCEL_PROJECT_PRODUCTION_URL alone is unreliable here — when no custom
 * domain is attached it resolves to the *.vercel.app host, which would make the
 * staging domain look canonical. NEXT_PUBLIC_SERVER_URL is the source of truth.
 */
export function getCanonicalHost(): string {
  const raw =
    process.env.CANONICAL_DOMAIN ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    ''

  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .trim()
}
