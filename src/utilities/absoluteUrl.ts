/**
 * Resolve a media/page URL for metadata, JSON-LD and feeds.
 *
 * - Absolute http(s) URLs (e.g. Supabase Storage media) pass through unchanged.
 * - Protocol-relative URLs (`//host/x`) get `https:`.
 * - Relative paths resolve against `base` (the site URL), with exactly one `/`.
 *
 * Previously callers did `base + url`, which turned a Supabase-hosted image into
 * `https://911electrics.comhttps://…supabase.co/…` in og:image / twitter:image.
 */
export function absoluteUrl(url: string, base: string): string
export function absoluteUrl(url: string | null | undefined, base: string): string | undefined
export function absoluteUrl(url: string | null | undefined, base: string): string | undefined {
  if (!url) return undefined
  const u = url.trim()
  if (!u) return undefined
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('//')) return `https:${u}`
  const b = base.replace(/\/+$/, '')
  return `${b}${u.startsWith('/') ? '' : '/'}${u}`
}
