import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REGION_LABEL,
  cityRegion,
  cityRegionLabel,
  nearbyCities,
} from '@/lib/city-regions'

/** The live service-area slugs, as they appear in the sitemap. */
const CITY_SLUGS = [
  'alhambra',
  'altadena',
  'arcadia',
  'arleta',
  'baldwin-park',
  'beverly-hills',
  'burbank',
  'calabasas',
  'canoga-park',
  'chatsworth',
  'duarte',
  'eagle-rock',
  'el-monte',
  'encino',
  'glendale',
  'granada-hills',
  'hancock-park',
  'highland-park',
  'hollywood',
  'la-canada',
  'la-crescenta',
  'long-beach',
  'los-feliz',
  'melrose',
  'mission-hills',
  'monrovia',
  'montebello',
  'monterey-park',
  'montrose',
  'north-hills',
  'north-hollywood',
  'northridge',
  'oxnard',
  'pasadena',
  'porter-ranch',
  'reseda',
  'rosemead',
  'san-fernando',
  'san-fernando-valley',
  'san-gabriel',
  'san-marino',
  'santa-monica',
  'sherman-oaks',
  'sierra-madre',
  'south-pasadena',
  'studio-city',
  'sun-valley',
  'sunland',
  'sylmar',
  'tarzana',
  'temple-city',
  'thousand-oaks',
  'toluca-lake',
  'tujunga',
  'van-nuys',
  'west-hills',
  'woodland-hills',
].map((token) => ({ slug: `electrician-${token}-ca` }))

// The template shows nine.
const MAX_NEARBY = 9

describe('cityRegion', () => {
  it('maps every live service area to a region', () => {
    const unmapped = CITY_SLUGS.filter((c) => cityRegion(c.slug) === null)
    expect(unmapped.map((c) => c.slug)).toEqual([])
  })

  it('accepts a bare token as well as a full city slug', () => {
    expect(cityRegion('burbank')).toBe('sfv')
    expect(cityRegion('electrician-burbank-ca')).toBe('sfv')
  })

  it('returns null for a city it does not know', () => {
    expect(cityRegion('electrician-fresno-ca')).toBeNull()
  })
})

describe('cityRegionLabel', () => {
  it('names the region a city sits in', () => {
    expect(cityRegionLabel('electrician-burbank-ca')).toBe('the San Fernando Valley')
    expect(cityRegionLabel('electrician-pasadena-ca')).toBe('the San Gabriel Valley')
    expect(cityRegionLabel('electrician-glendale-ca')).toBe('the Verdugo & Crescenta Valley area')
  })

  it('prefers a region set on the city row in the database', () => {
    expect(cityRegionLabel('electrician-burbank-ca', 'the Burbank Media District')).toBe(
      'the Burbank Media District',
    )
  })

  it('falls back to a generic area name for an unmapped city', () => {
    expect(cityRegionLabel('electrician-fresno-ca')).toBe(DEFAULT_REGION_LABEL)
  })
})

describe('nearbyCities', () => {
  it('never includes the city itself', () => {
    for (const city of CITY_SLUGS) {
      const result = nearbyCities(city.slug, CITY_SLUGS, MAX_NEARBY)
      expect(result.map((c) => c.slug)).not.toContain(city.slug)
    }
  })

  it('fills the list for every city', () => {
    for (const city of CITY_SLUGS) {
      expect(nearbyCities(city.slug, CITY_SLUGS, MAX_NEARBY)).toHaveLength(MAX_NEARBY)
    }
  })

  it('prefers cities in the same region', () => {
    // Burbank is in the San Fernando Valley, which has plenty of peers, so
    // every suggestion should be one.
    const result = nearbyCities('electrician-burbank-ca', CITY_SLUGS, MAX_NEARBY)
    expect(result.every((c) => cityRegion(c.slug) === 'sfv')).toBe(true)

    // Pasadena likewise, in the San Gabriel Valley.
    const pasadena = nearbyCities('electrician-pasadena-ca', CITY_SLUGS, MAX_NEARBY)
    expect(pasadena.every((c) => cityRegion(c.slug) === 'sgv')).toBe(true)
  })

  it('tops up from adjacent regions when a region is small', () => {
    // Long Beach is alone in the South Bay; the rest must come from the
    // regions declared adjacent to it, nearest first.
    const result = nearbyCities('electrician-long-beach-ca', CITY_SLUGS, MAX_NEARBY)
    expect(result).toHaveLength(MAX_NEARBY)
    expect(cityRegion(result[0]!.slug)).toBe('westside')
  })

  it('keeps Ventura County cities pointing at each other first', () => {
    const result = nearbyCities('electrician-oxnard-ca', CITY_SLUGS, MAX_NEARBY)
    expect(result[0]!.slug).toBe('electrician-thousand-oaks-ca')
  })

  it('no longer offers cities from across the county as nearby', () => {
    // The regression this module exists for: Glendale used to be handed the
    // nine alphabetically-first cities (Arleta, Beverly Hills, …).
    const glendale = nearbyCities('electrician-glendale-ca', CITY_SLUGS, MAX_NEARBY).map(
      (c) => c.slug,
    )
    expect(glendale).not.toContain('electrician-beverly-hills-ca')
    expect(glendale).not.toContain('electrician-long-beach-ca')
    expect(glendale).not.toContain('electrician-oxnard-ca')
  })

  it('spreads internal links across every service area', () => {
    // The point of the change: with `slice(0, 9)` exactly nine cities ever
    // received a link from the combo pages. Every city should now be reachable.
    const linked = new Set<string>()
    for (const city of CITY_SLUGS) {
      for (const near of nearbyCities(city.slug, CITY_SLUGS, MAX_NEARBY)) {
        linked.add(near.slug)
      }
    }
    const orphans = CITY_SLUGS.filter((c) => !linked.has(c.slug)).map((c) => c.slug)
    expect(orphans).toEqual([])
  })

  it('gives neighboring cities different suggestion sets', () => {
    const burbank = nearbyCities('electrician-burbank-ca', CITY_SLUGS, MAX_NEARBY).map(
      (c) => c.slug,
    )
    const vanNuys = nearbyCities('electrician-van-nuys-ca', CITY_SLUGS, MAX_NEARBY).map(
      (c) => c.slug,
    )
    expect(burbank).not.toEqual(vanNuys)
  })

  it('is deterministic', () => {
    const a = nearbyCities('electrician-tarzana-ca', CITY_SLUGS, MAX_NEARBY)
    const b = nearbyCities('electrician-tarzana-ca', CITY_SLUGS, MAX_NEARBY)
    expect(a).toEqual(b)
  })

  it('handles an unmapped city without throwing', () => {
    const result = nearbyCities('electrician-fresno-ca', CITY_SLUGS, MAX_NEARBY)
    expect(result).toHaveLength(MAX_NEARBY)
  })

  it('does not exceed the requested maximum', () => {
    expect(nearbyCities('electrician-burbank-ca', CITY_SLUGS, 3)).toHaveLength(3)
  })
})
