/**
 * Geographic grouping for the service-area cities.
 *
 * The service × city landing pages offer a "we also serve nearby cities" list.
 * That list used to be `cities.slice(0, MAX_NEARBY)` over a list ordered by
 * `ORDER BY city_name`, which made it the nine alphabetically-first cities —
 * the *same nine* on all ~348 combo pages. Two problems:
 *
 *   1. It was not true. A Glendale page offered Arleta and Beverly Hills as
 *      "nearby"; they are on the other side of the county.
 *   2. Every combo page funnelled its internal links into the same nine
 *      cities, so ~48 service areas received no internal links from the
 *      programmatic pages at all.
 *
 * The `cities.region` column exists but is NULL for every row, so the grouping
 * lives here as data instead. A non-null `region` from the database still wins
 * (see `cityRegionLabel`), so the admin can override any of this later.
 *
 * This module is deliberately pure — no DB or server imports — so it runs in
 * the render path and is unit-testable.
 */

export type CityRegion =
  | 'central-la'
  | 'foothills'
  | 'sfv'
  | 'sgv'
  | 'south-bay'
  | 'ventura'
  | 'westside'

/** Slug (without the `electrician-` prefix) → region. */
const REGION_BY_CITY: Record<string, CityRegion> = {
  // San Fernando Valley
  arleta: 'sfv',
  burbank: 'sfv',
  calabasas: 'sfv',
  'canoga-park': 'sfv',
  chatsworth: 'sfv',
  encino: 'sfv',
  'granada-hills': 'sfv',
  'mission-hills': 'sfv',
  'north-hills': 'sfv',
  'north-hollywood': 'sfv',
  northridge: 'sfv',
  'porter-ranch': 'sfv',
  reseda: 'sfv',
  'san-fernando': 'sfv',
  'san-fernando-valley': 'sfv',
  'sherman-oaks': 'sfv',
  'studio-city': 'sfv',
  'sun-valley': 'sfv',
  sylmar: 'sfv',
  tarzana: 'sfv',
  'toluca-lake': 'sfv',
  'van-nuys': 'sfv',
  'west-hills': 'sfv',
  'woodland-hills': 'sfv',

  // Verdugos / Crescenta Valley foothills
  glendale: 'foothills',
  'la-canada': 'foothills',
  'la-crescenta': 'foothills',
  montrose: 'foothills',
  sunland: 'foothills',
  tujunga: 'foothills',

  // San Gabriel Valley
  alhambra: 'sgv',
  altadena: 'sgv',
  arcadia: 'sgv',
  'baldwin-park': 'sgv',
  duarte: 'sgv',
  'el-monte': 'sgv',
  monrovia: 'sgv',
  montebello: 'sgv',
  'monterey-park': 'sgv',
  pasadena: 'sgv',
  rosemead: 'sgv',
  'san-gabriel': 'sgv',
  'san-marino': 'sgv',
  'sierra-madre': 'sgv',
  'south-pasadena': 'sgv',
  'temple-city': 'sgv',

  // Central & Northeast Los Angeles
  'eagle-rock': 'central-la',
  'hancock-park': 'central-la',
  'highland-park': 'central-la',
  hollywood: 'central-la',
  'los-feliz': 'central-la',
  melrose: 'central-la',

  // Westside
  'beverly-hills': 'westside',
  'santa-monica': 'westside',

  // South Bay / Long Beach
  'long-beach': 'south-bay',

  // Ventura County / Conejo Valley
  oxnard: 'ventura',
  'thousand-oaks': 'ventura',
}

/**
 * Which regions border each region, nearest first. Used to top up a "nearby"
 * list when a city's own region has fewer peers than we want to show.
 */
const ADJACENT: Record<CityRegion, CityRegion[]> = {
  'central-la': ['westside', 'foothills', 'sgv', 'sfv'],
  foothills: ['sfv', 'sgv', 'central-la'],
  sfv: ['foothills', 'ventura', 'central-la', 'westside'],
  sgv: ['foothills', 'central-la', 'sfv'],
  'south-bay': ['westside', 'central-la'],
  ventura: ['sfv'],
  westside: ['central-la', 'sfv', 'south-bay'],
}

const REGION_LABELS: Record<CityRegion, string> = {
  'central-la': 'Central & Northeast Los Angeles',
  foothills: 'the Verdugo & Crescenta Valley area',
  sfv: 'the San Fernando Valley',
  sgv: 'the San Gabriel Valley',
  'south-bay': 'the South Bay & Long Beach',
  ventura: 'Ventura County',
  westside: 'the Westside',
}

/** Fallback when a city is not in the map (e.g. a newly seeded city). */
export const DEFAULT_REGION_LABEL = 'the Los Angeles area'

const CITY_SLUG_PREFIX = 'electrician-'
const CITY_SLUG_SUFFIX = '-ca'

/**
 * Reduce a city slug to the bare place name used as a key below — accepting
 * `electrician-burbank-ca`, `burbank-ca` or `burbank`.
 */
function token(citySlug: string): string {
  let t = citySlug
  if (t.startsWith(CITY_SLUG_PREFIX)) t = t.slice(CITY_SLUG_PREFIX.length)
  if (t.endsWith(CITY_SLUG_SUFFIX)) t = t.slice(0, -CITY_SLUG_SUFFIX.length)
  return t
}

/** The region a city belongs to, or null if it is not mapped. */
export function cityRegion(citySlug: string): CityRegion | null {
  return REGION_BY_CITY[token(citySlug)] ?? null
}

/**
 * Human-readable area name for headings ("… across the San Gabriel Valley").
 * A `region` value set on the city row in the database wins over the map.
 */
export function cityRegionLabel(citySlug: string, dbRegion?: string | null): string {
  if (dbRegion) return dbRegion
  const region = cityRegion(citySlug)
  return region ? REGION_LABELS[region] : DEFAULT_REGION_LABEL
}

/** Rotate `items` so it starts at `offset`, wrapping around. */
function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items
  const i = ((offset % items.length) + items.length) % items.length
  return [...items.slice(i), ...items.slice(0, i)]
}

/**
 * Cities to offer as "nearby" for `citySlug`, nearest-region first.
 *
 * Within a region the list is rotated to start just after the current city, so
 * neighboring cities link onward to *different* peers instead of all pointing
 * at the same alphabetical head. Across ~348 combo pages that spreads internal
 * links over every service area rather than nine of them.
 *
 * Input order is preserved within each band, so the caller's ordering
 * (alphabetical, from the nav query) still drives presentation.
 */
export function nearbyCities<T extends { slug: string }>(
  citySlug: string,
  candidates: T[],
  max: number,
): T[] {
  const others = candidates.filter((c) => c.slug !== citySlug)
  const region = cityRegion(citySlug)
  if (!region) return others.slice(0, max)

  const byRegion = new Map<CityRegion | 'unmapped', T[]>()
  for (const c of others) {
    const key = cityRegion(c.slug) ?? 'unmapped'
    const bucket = byRegion.get(key)
    if (bucket) bucket.push(c)
    else byRegion.set(key, [c])
  }

  const sameRegion = byRegion.get(region) ?? []
  // Start just after this city's own position among its regional peers.
  const selfIndex = sameRegion.findIndex((c) => c.slug > citySlug)
  const ordered: T[] = [...rotate(sameRegion, selfIndex === -1 ? 0 : selfIndex)]

  // Then adjacent regions, nearest first. These are taken round-robin rather
  // than one whole region at a time: concatenating them meant a large
  // neighbour (the 24-city San Fernando Valley) could fill every remaining
  // slot and a one-city region further down the list — Long Beach — would
  // never be linked from anywhere. Each region is also rotated by a stable
  // per-city offset so the spillover varies from city to city.
  const spread = citySlug.length
  const bands = ADJACENT[region].map((adj) => rotate(byRegion.get(adj) ?? [], spread))
  for (let i = 0; ordered.length < max && bands.some((b) => i < b.length); i++) {
    for (const band of bands) {
      if (band[i]) ordered.push(band[i]!)
    }
  }

  // Only if the region and its neighbours together cannot fill the list do we
  // reach for cities further afield, so a normal page never offers one.
  if (ordered.length < max) {
    for (const [key, bucket] of byRegion) {
      if (key !== region && !ADJACENT[region].includes(key as CityRegion)) {
        ordered.push(...bucket)
      }
    }
  }

  return ordered.slice(0, max)
}
