import { describe, expect, it } from 'vitest'

import { redirects } from '../../redirects'
import {
  BLOG_CONFIRMED_POST_DESTINATIONS,
  CITY_PANEL_MERGE_RETIRED,
  cleanupRedirects,
  KNOWN_PAGE_DESTINATIONS,
  LEGACY_REDIRECTS,
  PROTECTED_POST_PATHS,
  RETIRED_COMBOS,
  REVIEWED_POST_DESTINATIONS,
  SGV_RETIRED_COMBOS,
} from '@/lib/seo-cleanup'
import {
  hubServiceHref,
  isRetiredCombo,
  retiredComboTarget,
  serviceCityPath,
} from '@/lib/service-city'

// Kept posts of the city panel-page merge (Haik approved 2026-11-09 10:27 PM PT).
const MERGE_KEPT_POSTS = new Set<string>(Object.values(CITY_PANEL_MERGE_RETIRED))

const SERVICE_TOKENS = [
  'electrical-panel-upgrades',
  'electrical-repairs',
  'emergency-electrician',
  'ev-charger-installation',
  'lighting-installation-upgrades',
  'new-construction-electrical',
]
const SGV = [
  'alhambra',
  'baldwin-park',
  'duarte',
  'el-monte',
  'monrovia',
  'montebello',
  'monterey-park',
  'rosemead',
  'san-gabriel',
  'san-marino',
  'sierra-madre',
  'south-pasadena',
  'temple-city',
]
// Round 3 (Blog's ASK list): must NOT be retired in round 1.
const ROUND_3_SGV = [
  '/ev-charger-installation-san-gabriel-ca/',
  '/electrical-panel-upgrades-alhambra-ca/',
  '/electrical-panel-upgrades-duarte-ca/',
  '/electrical-panel-upgrades-el-monte-ca/',
  '/electrical-panel-upgrades-san-marino-ca/',
  '/electrical-panel-upgrades-temple-city-ca/',
  '/electrical-repairs-baldwin-park-ca/',
  '/electrical-repairs-montebello-ca/',
  '/electrical-repairs-rosemead-ca/',
  '/ev-charger-installation-monterey-park-ca/',
]

const slash = (p: string) => (p.endsWith('/') ? p : `${p}/`)
const CITY_HUB = /^\/electrician-[a-z-]+-ca\/$/

const all = cleanupRedirects()
const sources = new Set(all.flatMap((r) => [slash(r.source), r.source.replace(/\/$/, '')]))

describe('retired service×city combos (round 1)', () => {
  const entries = Object.entries(SGV_RETIRED_COMBOS)

  it('retires exactly 68 SGV combos, none from the round-3 list', () => {
    expect(entries).toHaveLength(68)
    const expected = SERVICE_TOKENS.flatMap((s) => SGV.map((c) => `/${s}-${c}-ca/`)).filter(
      (p) => !ROUND_3_SGV.includes(p),
    )
    expect(entries.map(([p]) => p).sort()).toEqual(expected.sort())
  })

  it('each combo 301s to its own city hub', () => {
    for (const [source, destination] of entries) {
      const city = SGV.find((c) => source.endsWith(`-${c}-ca/`))
      expect(city, source).toBeTruthy()
      expect(destination).toBe(`/electrician-${city}-ca/`)
    }
  })

  it('isRetiredCombo / retiredComboTarget agree with the table', () => {
    expect(
      isRetiredCombo('ev-charger-installation-los-angeles-ca', 'electrician-alhambra-ca'),
    ).toBe(true)
    expect(
      isRetiredCombo('ev-charger-installation-los-angeles-ca', 'electrician-san-gabriel-ca'),
    ).toBe(false)
    expect(
      isRetiredCombo('ev-charger-installation-los-angeles-ca', 'electrician-altadena-ca'),
    ).toBe(false)
    expect(isRetiredCombo('electrical-repairs-los-angeles-ca', 'electrician-pasadena-ca')).toBe(
      false,
    )
    expect(retiredComboTarget('new-construction-electrical-temple-city-ca')).toBe(
      '/electrician-temple-city-ca/',
    )
    expect(retiredComboTarget('new-construction-electrical-pasadena-ca')).toBeNull()
    expect(serviceCityPath('electrical-repairs-los-angeles-ca', 'electrician-duarte-ca')).toBe(
      '/electrical-repairs-duarte-ca/',
    )
  })
})

describe('city panel-page merge (2026-11-10)', () => {
  it('retires exactly the 4 duplicate panel combos, each to its kept post', () => {
    expect(CITY_PANEL_MERGE_RETIRED).toEqual({
      '/electrical-panel-upgrades-pasadena-ca/': '/electrician-pasadena-ca-panel-upgrades/',
      '/electrical-panel-upgrades-altadena-ca/': '/electrician-altadena-ca-panel-upgrades/',
      '/electrical-panel-upgrades-glendale-ca/':
        '/electrician-glendale-ca-panel-upgrades-ev-chargers/',
      '/electrical-panel-upgrades-burbank-ca/':
        '/electrician-burbank-ca-panel-upgrades-ev-chargers/',
    })
    expect(Object.keys(RETIRED_COMBOS)).toHaveLength(72)
    for (const [source, destination] of Object.entries(CITY_PANEL_MERGE_RETIRED)) {
      expect(RETIRED_COMBOS[source]).toBe(destination)
      expect(cleanupRedirects()).toContainEqual({ source, destination, statusCode: 301 })
    }
  })

  it('hub links go straight to the kept post (or main service page for SGV hubs)', () => {
    const panel = 'electrical-panel-upgrades-los-angeles-ca'
    expect(hubServiceHref(panel, 'electrician-pasadena-ca')).toBe(
      '/electrician-pasadena-ca-panel-upgrades/',
    )
    expect(hubServiceHref(panel, 'electrician-burbank-ca')).toBe(
      '/electrician-burbank-ca-panel-upgrades-ev-chargers/',
    )
    expect(hubServiceHref(panel, 'electrician-baldwin-park-ca')).toBe(`/${panel}/`)
    expect(hubServiceHref('electrical-repairs-los-angeles-ca', 'electrician-pasadena-ca')).toBe(
      '/electrical-repairs-pasadena-ca/',
    )
    expect(isRetiredCombo(panel, 'electrician-glendale-ca')).toBe(true)
  })
})

describe('legacy redirects', () => {
  it('has the 38 approved + 2 Blog-confirmed old URLs', () => {
    expect(LEGACY_REDIRECTS).toHaveLength(40)
    expect(new Set(LEGACY_REDIRECTS.map((r) => r.source)).size).toBe(40)
  })
})

describe('all cleanup redirects', () => {
  it('are real 301s with trailing-slash sources in next.config', () => {
    for (const r of cleanupRedirects()) {
      expect(r.statusCode).toBe(301)
      expect(r.source.endsWith('/')).toBe(true)
    }
  })

  it('never chain: no destination is itself a redirect source or a retired combo', () => {
    for (const r of all) {
      expect(sources.has(r.destination), `${r.source} -> ${r.destination}`).toBe(false)
      expect(r.destination in RETIRED_COMBOS).toBe(false)
      expect(r.destination.endsWith('/')).toBe(true)
    }
  })

  it('land only on known pages, city hubs, or reviewed post destinations', () => {
    const posts = new Set<string>([
      ...BLOG_CONFIRMED_POST_DESTINATIONS,
      ...REVIEWED_POST_DESTINATIONS,
    ])
    const known = new Set<string>(KNOWN_PAGE_DESTINATIONS)
    for (const r of all) {
      const ok =
        known.has(r.destination) ||
        CITY_HUB.test(r.destination) ||
        posts.has(r.destination) ||
        MERGE_KEPT_POSTS.has(r.destination)
      expect(ok, `${r.source} -> ${r.destination}`).toBe(true)
    }
  })

  it('only the 2 Blog-confirmed old post URLs point into new post destinations', () => {
    const confirmed = all.filter((r) =>
      (BLOG_CONFIRMED_POST_DESTINATIONS as readonly string[]).includes(r.destination),
    )
    expect(new Set(confirmed.map((r) => r.source.replace(/\/$/, '')))).toEqual(
      new Set(['/los-angeles-gfci-outlet-upgrades', '/whole-house-surge-protection-los-angeles']),
    )
  })

  it('never touch a protected post (as source or destination)', () => {
    const protectedPaths = new Set<string>(PROTECTED_POST_PATHS)
    for (const r of all) {
      expect(protectedPaths.has(slash(r.source)), r.source).toBe(false)
      // Exception: the 4 kept posts of the city panel-page merge (approved by Haik).
      if (!MERGE_KEPT_POSTS.has(r.destination)) {
        expect(protectedPaths.has(r.destination), r.destination).toBe(false)
      }
    }
  })
})

describe('redirects() ordering', () => {
  it('emits cleanup 301s before the /services/electrical catch-all', async () => {
    const list = (await redirects!()) as { source: string; statusCode?: number }[]
    const catchAll = list.findIndex((r) => r.source === '/services/electrical/:path*')
    expect(catchAll).toBeGreaterThan(0)
    for (const r of cleanupRedirects()) {
      const i = list.findIndex((x) => x.source === r.source)
      expect(i, r.source).toBeGreaterThan(0)
      expect(i).toBeLessThan(catchAll)
    }
  })
})
