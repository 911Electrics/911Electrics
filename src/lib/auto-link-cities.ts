import type { RichTextData } from '@/db/types'

import {
  applyLink,
  collectLinkedPaths,
  isTextNode,
  normalizeLinkPath,
  SITE_ORIGIN,
  type LexNode,
} from '@/lib/auto-link-services'

/**
 * Server-side internal linking from blog posts to service-area (city) pages.
 *
 * `autoLinkServices` only ever links to the six Los Angeles service pages, so a
 * post written *for a city* — "Highland Park Electrician in Los Angeles: Panel
 * Upgrades" — never linked to /electrician-highland-park-ca/. Those posts are
 * the site's strongest organic pages, and the city pages they should be
 * supporting sat ten-plus positions behind them with no contextual link from
 * the post that outranks them. This closes that gap.
 *
 * Same conservative rules as the service linker:
 *   - at most ONE link per city, and at most `max` city links per post;
 *   - a city named in the post TITLE is linked first (it is what the post is
 *     about); remaining slots go to other cities in document order;
 *   - only the first eligible mention is linked, never inside an existing
 *     link, a heading or inline code, and never to a page the author already
 *     linked by hand;
 *   - the matched text is kept verbatim as the anchor.
 *
 * City names are ambiguous in ways service topics are not, so a match is
 * rejected when it is really part of something else:
 *   - a longer served city — "Pasadena" inside "South Pasadena", "San Fernando"
 *     inside "San Fernando Valley" (derived from the city list, so a newly
 *     added city guards its neighbours automatically);
 *   - a different place — "West Hollywood", "Hollywood Hills";
 *   - a street, utility or landmark — "Glendale Avenue", "Pasadena Water and
 *     Power", "Burbank Airport".
 *
 * Pure: no DB or server imports, so it is unit-testable and the caller passes
 * the city list in.
 */

export type LinkableCity = { cityName: string; slug: string; pathOverride: string | null }

/** Words that, directly before a city name, make it a different place. */
const FOREIGN_PREFIXES = ['North', 'South', 'East', 'West', 'Old', 'New', 'Lake', 'Mount', 'Port']

/** Words that, directly after a city name, make it a street, utility or landmark. */
const FOREIGN_SUFFIXES = [
  'Avenue',
  'Ave',
  'Boulevard',
  'Blvd',
  'Street',
  'St',
  'Road',
  'Rd',
  'Drive',
  'Dr',
  'Way',
  'Freeway',
  'Fwy',
  'Hills',
  'Heights',
  'Valley',
  'Canyon',
  'Water',
  'Unified',
  'Airport',
  'Bowl',
  'Sign',
  'City College',
  'Community College',
]

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Match a name with flexible internal whitespace ("Highland  Park", line-wrapped text). */
const namePattern = (name: string): string => name.trim().split(/\s+/).map(escapeRe).join('\\s+')

/**
 * Only flat `/{slug}/` city pages are link targets. Los Angeles carries a
 * `pathOverride` and is named in nearly every post — linking it would put the
 * same anchor on the whole blog.
 */
const isLinkable = (c: LinkableCity): boolean => !c.pathOverride && !!c.cityName.trim() && !!c.slug

/**
 * A regex matching `city` as a standalone place name. `allCities` supplies the
 * longer names it must not be mistaken for. The optional leading/trailing
 * "electrician" phrase widens the anchor when the writer already used one
 * ("electrician in Glendale", "Glendale electricians").
 */
export function cityMentionRegex(city: LinkableCity, allCities: LinkableCity[]): RegExp {
  const name = city.cityName.trim()
  const before = [...FOREIGN_PREFIXES]
  const after = [...FOREIGN_SUFFIXES]
  for (const other of allCities) {
    const otherName = other.cityName.trim()
    if (otherName === name) continue
    const at = otherName.indexOf(name)
    if (at === -1) continue
    const prefix = otherName.slice(0, at).trim()
    const suffix = otherName.slice(at + name.length).trim()
    if (prefix) before.push(prefix)
    if (suffix) after.push(suffix)
  }
  // A guard that the name itself ends/starts with would reject the city
  // outright ("Hills" must not block "Beverly Hills"), but these are
  // look-arounds *outside* the name, so they never see the name's own words.
  const notBefore = before.map((w) => `(?<!\\b${namePattern(w)}\\s)`).join('')
  const notAfter = `(?!\\s+(?:${after.map(namePattern).join('|')})\\b)`
  return new RegExp(
    `${notBefore}\\b(?:(?:[Ee]lectricians?|[Ee]lectrical\\s+contractors?)\\s+in\\s+)?${namePattern(name)}\\b${notAfter}(?:\\s+[Ee]lectricians?\\b)?`,
  )
}

/** Cities named in `text`, in the order they appear. */
export function citiesMentionedIn(text: string, cities: LinkableCity[]): LinkableCity[] {
  const linkable = cities.filter(isLinkable)
  return linkable
    .map((city) => ({ city, at: cityMentionRegex(city, linkable).exec(text)?.index ?? -1 }))
    .filter((hit) => hit.at !== -1)
    .sort((a, b) => a.at - b.at)
    .map((hit) => hit.city)
}

type Slot = { arr: LexNode[]; idx: number; text: string }

/** Lexicographic `a < b` for equal-length rank tuples. */
function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
  return false
}

/** Linkable text nodes in document order (skips links, headings, inline code). */
function linkableTextSlots(nodes: LexNode[], out: Slot[] = []): Slot[] {
  const IS_CODE = 16
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx]
    const type = (n as { type?: string }).type
    if (type === 'link' || type === 'autolink' || type === 'heading') continue
    if (isTextNode(n)) {
      if (!((n.format ?? 0) & IS_CODE)) out.push({ arr: nodes, idx, text: n.text })
      continue
    }
    const children = (n as { children?: LexNode[] }).children
    if (Array.isArray(children)) linkableTextSlots(children, out)
  }
  return out
}

const cityUrl = (c: LinkableCity): string => `${SITE_ORIGIN}/${c.slug}/`

/**
 * Return a copy of `data` with up to `max` links to city pages inserted.
 * Never mutates the input.
 */
export function autoLinkCities(
  data: RichTextData,
  cities: LinkableCity[],
  opts: { title?: string | null; max?: number } = {},
): RichTextData {
  const max = opts.max ?? 2
  const clone: RichTextData =
    typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data))

  const root = clone?.root
  if (!root || !Array.isArray(root.children)) return clone

  const linkable = cities.filter(isLinkable)
  if (linkable.length === 0 || max <= 0) return clone

  const alreadyLinked = collectLinkedPaths(root.children)
  const pending = new Map(
    linkable
      .filter((c) => !alreadyLinked.has(normalizeLinkPath(cityUrl(c))))
      .map((c) => [c.slug, { city: c, re: cityMentionRegex(c, linkable) }] as const),
  )
  const titleSlugs = new Set(
    opts.title ? citiesMentionedIn(opts.title, linkable).map((c) => c.slug) : [],
  )

  for (let applied = 0; applied < max && pending.size > 0; applied++) {
    // The tree changes after every insertion, so re-enumerate each round.
    const slots = linkableTextSlots(root.children)
    let best: { slug: string; slot: Slot; match: RegExpExecArray; rank: number[] } | null = null

    for (const [slug, { re }] of pending) {
      for (let s = 0; s < slots.length; s++) {
        const match = re.exec(slots[s].text)
        if (!match) continue
        // Title cities outrank everything; then earliest in the document.
        const rank = [titleSlugs.has(slug) ? 0 : 1, s, match.index]
        if (!best || lexLess(rank, best.rank)) {
          best = { slug, slot: slots[s], match, rank }
        }
        break // first mention of this city only
      }
    }

    if (!best) break
    applyLink(best.slot.arr, best.slot.idx, best.match, cityUrl(pending.get(best.slug)!.city))
    pending.delete(best.slug)
  }

  return clone
}
