import { describe, expect, it } from 'vitest'

import {
  buildComboSlug,
  cityToken,
  isEligibleCity,
  parseComboSlug,
  serviceCityPath,
  serviceToken,
} from '@/lib/service-city'

const SERVICES = [
  { slug: 'electrical-repairs-los-angeles-ca' },
  { slug: 'electrical-panel-upgrades-los-angeles-ca' },
  { slug: 'ev-charger-installation-los-angeles-ca' },
  { slug: 'emergency-electrician-los-angeles-ca' },
  { slug: 'lighting-installation-upgrades-los-angeles-ca' },
  { slug: 'new-construction-electrical-los-angeles-ca' },
]

const CITIES = [
  { slug: 'electrician-burbank-ca', pathOverride: null },
  { slug: 'electrician-glendale-ca', pathOverride: null },
  { slug: 'electrician-pasadena-ca', pathOverride: null },
  // Los Angeles is excluded: it carries a pathOverride.
  { slug: 'electrician-los-angeles-hub', pathOverride: '/services/los-angeles-ca/' },
]

describe('token helpers', () => {
  it('drops the service suffix and city prefix', () => {
    expect(serviceToken('ev-charger-installation-los-angeles-ca')).toBe('ev-charger-installation')
    expect(cityToken('electrician-burbank-ca')).toBe('burbank-ca')
  })

  it('builds combo slugs and paths', () => {
    expect(buildComboSlug('ev-charger-installation-los-angeles-ca', 'electrician-burbank-ca')).toBe(
      'ev-charger-installation-burbank-ca',
    )
    expect(serviceCityPath('electrical-panel-upgrades-los-angeles-ca', 'electrician-glendale-ca')).toBe(
      '/electrical-panel-upgrades-glendale-ca/',
    )
  })
})

describe('isEligibleCity', () => {
  it('accepts flat electrician-* cities and rejects overridden / off-convention ones', () => {
    expect(isEligibleCity({ slug: 'electrician-burbank-ca', pathOverride: null })).toBe(true)
    expect(isEligibleCity({ slug: 'electrician-los-angeles-hub', pathOverride: '/services/los-angeles-ca/' })).toBe(
      false,
    )
    expect(isEligibleCity({ slug: 'some-landing-page', pathOverride: null })).toBe(false)
  })
})

describe('parseComboSlug', () => {
  it('resolves a valid combo to its service and city', () => {
    expect(parseComboSlug('ev-charger-installation-burbank-ca', SERVICES, CITIES)).toEqual({
      serviceSlug: 'ev-charger-installation-los-angeles-ca',
      citySlug: 'electrician-burbank-ca',
    })
  })

  it('disambiguates services that share a prefix', () => {
    // "electrical-panel-upgrades" must not be mis-read as "electrical-repairs".
    expect(parseComboSlug('electrical-panel-upgrades-glendale-ca', SERVICES, CITIES)).toEqual({
      serviceSlug: 'electrical-panel-upgrades-los-angeles-ca',
      citySlug: 'electrician-glendale-ca',
    })
    expect(parseComboSlug('electrical-repairs-pasadena-ca', SERVICES, CITIES)).toEqual({
      serviceSlug: 'electrical-repairs-los-angeles-ca',
      citySlug: 'electrician-pasadena-ca',
    })
  })

  it('rejects non-combo slugs', () => {
    expect(parseComboSlug('foo-bar', SERVICES, CITIES)).toBeNull()
    expect(parseComboSlug('electrician-burbank-ca', SERVICES, CITIES)).toBeNull()
  })

  it('never collides with an existing flat service slug', () => {
    expect(parseComboSlug('ev-charger-installation-los-angeles-ca', SERVICES, CITIES)).toBeNull()
  })

  it('excludes Los Angeles (path override)', () => {
    expect(parseComboSlug('ev-charger-installation-los-angeles-hub', SERVICES, CITIES)).toBeNull()
  })

  it('round-trips every eligible combo', () => {
    for (const service of SERVICES) {
      for (const city of CITIES.filter(isEligibleCity)) {
        const slug = buildComboSlug(service.slug, city.slug)
        expect(parseComboSlug(slug, SERVICES, CITIES)).toEqual({
          serviceSlug: service.slug,
          citySlug: city.slug,
        })
      }
    }
  })
})
