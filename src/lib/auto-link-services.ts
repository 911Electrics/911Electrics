import type { RichTextData, SerializedLexicalNode } from '@/db/types'

/**
 * Server-side internal linking for blog post bodies.
 *
 * When a post is created through the blog API, this links the first plain-text
 * mention of a core service topic ("panel upgrade", "EV charger", "rewiring",
 * …) to that service's page. It runs on every publish, so auto-generated posts
 * get on-topic internal links even when the writer forgets — internal links to
 * the money pages are one of the higher-leverage on-page SEO signals for a
 * local contractor site.
 *
 * It is deliberately conservative:
 *   - at most ONE link per service URL, and at most `max` links per post;
 *   - only the FIRST eligible mention of each topic is linked;
 *   - text inside an existing link is never re-linked, and headings and inline
 *     code are skipped entirely;
 *   - a service page the author already linked by hand is left alone — the
 *     auto-linker fills gaps, it never adds a second link to the same URL;
 *   - matches are word-bounded and case-insensitive, and the matched text is
 *     kept verbatim as the anchor (formatting preserved).
 */

const IS_CODE = 16 // Lexical text-format bit for inline code (mirror markdown-to-lexical)

export type LexNode = SerializedLexicalNode

/** Canonical origin used for every auto-inserted internal link. */
export const SITE_ORIGIN = 'https://911electrics.com'

/** Service topics in priority order (money pages first). One entry per URL. */
const SERVICE_RULES: { url: string; re: RegExp }[] = [
  {
    url: 'https://911electrics.com/ev-charger-installation-los-angeles-ca/',
    re: /\b(?:EV charger installations?|EV chargers?|Level 2 (?:EV )?chargers?)\b/i,
  },
  {
    url: 'https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/',
    re: /\b(?:electrical panel upgrades?|panel upgrades?|200-?amp (?:panel|service)(?: upgrades?)?|service panel upgrades?)\b/i,
  },
  {
    url: 'https://911electrics.com/electrical-repairs-los-angeles-ca/',
    re: /\b(?:rewir(?:e|ing)|knob-and-tube wiring|aluminum wiring|electrical (?:repairs?|troubleshooting))\b/i,
  },
  {
    url: 'https://911electrics.com/emergency-electrician-los-angeles-ca/',
    re: /\b(?:emergency electrician|24\/7 emergency electric(?:al|ian)?)\b/i,
  },
  {
    url: 'https://911electrics.com/lighting-installation-upgrades-los-angeles-ca/',
    re: /\b(?:recessed lighting|landscape lighting|lighting installations?|lighting upgrades?)\b/i,
  },
  {
    url: 'https://911electrics.com/new-construction-electrical-los-angeles-ca/',
    re: /\b(?:new construction electrical|new construction wiring)\b/i,
  },
]

export const isTextNode = (n: LexNode): n is LexNode & { text: string; format?: number } =>
  (n as { type?: string }).type === 'text' && typeof (n as { text?: unknown }).text === 'string'

const linkNode = (url: string, child: LexNode): LexNode => ({
  type: 'link',
  fields: { url, newTab: false, linkType: 'custom' },
  format: '',
  indent: 0,
  version: 2,
  children: [child],
  direction: null,
})

/**
 * Reduce an internal URL to a comparable path: origin (apex or www), query,
 * hash and trailing slash dropped, lowercased. `/Foo/`, `https://911electrics.com/foo`
 * and `https://www.911electrics.com/foo/#faq` all become `/foo`.
 */
export function normalizeLinkPath(url: string): string {
  const path = url
    .trim()
    .replace(/^https?:\/\/(?:www\.)?911electrics\.com/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
  return path.startsWith('/') ? path : `/${path}`
}

/** Normalized paths of every link already present in the document. */
export function collectLinkedPaths(nodes: LexNode[], into = new Set<string>()): Set<string> {
  for (const n of nodes) {
    const node = n as { type?: string; fields?: { url?: unknown }; url?: unknown; children?: LexNode[] }
    if (node.type === 'link' || node.type === 'autolink') {
      const url = node.fields?.url ?? node.url
      if (typeof url === 'string' && url) into.add(normalizeLinkPath(url))
    }
    if (Array.isArray(node.children)) collectLinkedPaths(node.children, into)
  }
  return into
}

/**
 * Find the first linkable text-node match for `re` in document order, skipping
 * `link`/`heading` subtrees and inline-code text. Returns the parent array, the
 * index within it, and the RegExp match.
 */
export function findFirst(
  nodes: LexNode[],
  re: RegExp,
): { arr: LexNode[]; idx: number; match: RegExpExecArray } | null {
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx]
    const type = (n as { type?: string }).type
    if (type === 'link' || type === 'heading') continue // never link inside a link; skip headings
    if (isTextNode(n)) {
      if ((n.format ?? 0) & IS_CODE) continue
      const match = re.exec(n.text)
      if (match) return { arr: nodes, idx, match }
      continue
    }
    const children = (n as { children?: LexNode[] }).children
    if (Array.isArray(children)) {
      const found = findFirst(children, re)
      if (found) return found
    }
  }
  return null
}

/** Split the matched text node in place, wrapping the matched span in a link. */
export function applyLink(
  arr: LexNode[],
  idx: number,
  match: RegExpExecArray,
  url: string,
): void {
  const t = arr[idx] as LexNode & { text: string }
  const { text } = t
  const start = match.index
  const end = start + match[0].length
  const pieces: LexNode[] = []
  if (start > 0) pieces.push({ ...t, text: text.slice(0, start) })
  pieces.push(linkNode(url, { ...t, text: text.slice(start, end) }))
  if (end < text.length) pieces.push({ ...t, text: text.slice(end) })
  arr.splice(idx, 1, ...pieces)
}

/**
 * Return a copy of `data` with up to `max` internal service links inserted.
 * Never mutates the input.
 */
export function autoLinkServices(data: RichTextData, max = 4): RichTextData {
  const clone: RichTextData =
    typeof structuredClone === 'function'
      ? structuredClone(data)
      : JSON.parse(JSON.stringify(data))

  const root = clone?.root
  if (!root || !Array.isArray(root.children)) return clone

  const alreadyLinked = collectLinkedPaths(root.children)
  let applied = 0
  for (const rule of SERVICE_RULES) {
    if (applied >= max) break
    if (alreadyLinked.has(normalizeLinkPath(rule.url))) continue
    const hit = findFirst(root.children, rule.re)
    if (hit) {
      applyLink(hit.arr, hit.idx, hit.match, rule.url)
      applied++
    }
  }
  return clone
}
