/**
 * Allow-list for link targets that come from stored rich text.
 *
 * Link URLs are typed into a prompt in Studio or arrive through the content
 * API, and are stored as-is. Only ordinary web, mail and phone links and
 * same-site relative links are rendered as links; anything else (`javascript:`,
 * `data:`, `vbscript:`, `file:` …) returns null and the caller renders the text
 * without an anchor. React already blocks `javascript:` at render — this makes
 * the rule explicit, covers the other schemes, and does not depend on the
 * framework's behaviour.
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Browsers ignore tabs, newlines and other control characters inside a
  // scheme ("java\tscript:"), so test the scheme on a copy with them removed.
  const compact = trimmed.replace(/[\u0000-\u0020\u007f]+/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(compact)?.[1].toLowerCase()
  if (scheme) return ALLOWED_SCHEMES.has(scheme) ? trimmed : null

  // No scheme: a relative URL. Protocol-relative (`//host`) is fine — it
  // inherits https.
  return trimmed
}
