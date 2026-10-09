/**
 * Programmatic service × city landing pages — pure slug helpers.
 *
 * The live URLs keep the site's flat `/{slug}/` shape. A combo slug is the
 * service slug with its `-los-angeles-ca` suffix dropped, joined to the city
 * slug with its `electrician-` prefix dropped, e.g.
 *
 *   service `ev-charger-installation-los-angeles-ca`
 *   + city  `electrician-burbank-ca`
 *   ->       `/ev-charger-installation-burbank-ca/`
 *
 * Los Angeles itself is excluded: the flat service pages already target LA, and
 * the LA city doc carries a `pathOverride`. Excluding it also guarantees no
 * combo slug ever collides with an existing flat service slug.
 *
 * This module is intentionally free of DB/server imports so it can run in the
 * request hot path and be unit-tested without a database.
 */

export const SERVICE_SLUG_SUFFIX = '-los-angeles-ca'
export const CITY_SLUG_PREFIX = 'electrician-'

type SlugItem = { slug: string }
type CityItem = { slug: string; pathOverride: string | null }

export function serviceToken(serviceSlug: string): string {
  return serviceSlug.endsWith(SERVICE_SLUG_SUFFIX)
    ? serviceSlug.slice(0, -SERVICE_SLUG_SUFFIX.length)
    : serviceSlug
}

export function cityToken(citySlug: string): string {
  return citySlug.startsWith(CITY_SLUG_PREFIX) ? citySlug.slice(CITY_SLUG_PREFIX.length) : citySlug
}

export function buildComboSlug(serviceSlug: string, citySlug: string): string {
  return `${serviceToken(serviceSlug)}-${cityToken(citySlug)}`
}

export function serviceCityPath(serviceSlug: string, citySlug: string): string {
  return `/${buildComboSlug(serviceSlug, citySlug)}/`
}

/** A city is eligible for combos when it uses the flat `/{slug}/` shape (no
 * path override) and follows the `electrician-…` slug convention. */
export function isEligibleCity(city: CityItem): boolean {
  return !city.pathOverride && city.slug.startsWith(CITY_SLUG_PREFIX)
}

/**
 * Resolve a flat slug back to its (service, city) pair, or null if it isn't a
 * valid combo. Pure and synchronous.
 */
export function parseComboSlug(
  slug: string,
  services: SlugItem[],
  cities: CityItem[],
): { serviceSlug: string; citySlug: string } | null {
  for (const service of services) {
    const prefix = `${serviceToken(service.slug)}-`
    if (!slug.startsWith(prefix)) continue
    const rest = slug.slice(prefix.length)
    const city = cities.find((c) => isEligibleCity(c) && cityToken(c.slug) === rest)
    if (city) return { serviceSlug: service.slug, citySlug: city.slug }
  }
  return null
}
