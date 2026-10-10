import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { redirects } from '../../redirects'
import {
  BLOG_CONFIRMED_POST_DESTINATIONS,
  cleanupRedirects,
  KNOWN_PAGE_DESTINATIONS,
  LEGACY_REDIRECTS,
  PROTECTED_POST_PATHS,
  RETIRED_COMBOS,
  REVIEWED_POST_DESTINATIONS,
} from '@/lib/seo-cleanup'
import { isRetiredCombo, retiredComboTarget, serviceCityPath } from '@/lib/service-city'

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

const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  redirects: { source: string; destination: string; statusCode: number }[]
}

const all = [...cleanupRedirects(), ...vercel.redirects]
const sources = new Set(all.flatMap((r) => [slash(r.source), r.source.replace(/\/$/, '')]))

describe('retired service×city combos (round 1)', () => {
  const entries = Object.entries(RETIRED_COMBOS)

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

describe('legacy redirects', () => {
  it('has the 38 approved + 2 Blog-confirmed old URLs', () => {
    expect(LEGACY_REDIRECTS).toHaveLength(40)
    expect(new Set(LEGACY_REDIRECTS.map((r) => r.source)).size).toBe(40)
  })

  it('vercel.json carries the bare (no-slash) form of every legacy source as a 301', () => {
    expect(vercel.redirects).toEqual(
      LEGACY_REDIRECTS.map((r) => ({
        source: r.source,
        destination: r.destination,
        statusCode: 301,
      })),
    )
    for (const r of vercel.redirects) expect(r.source.endsWith('/')).toBe(false)
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
        known.has(r.destination) || CITY_HUB.test(r.destination) || posts.has(r.destination)
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
      expect(protectedPaths.has(r.destination), r.destination).toBe(false)
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
