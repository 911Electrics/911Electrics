import 'server-only'

import { getCityBySlug, type CityDetail } from '@/lib/cities'
import { getCitiesNav, getServicesNav } from '@/lib/queries'
import { isEligibleCity, parseComboSlug, serviceCityPath } from '@/lib/service-city'
import { getServiceBySlug, type ServiceDetail } from '@/lib/services'

/** Data fetchers for the programmatic service × city landing pages. */

export type ServiceCityDetail = { service: ServiceDetail; city: CityDetail }

/** Load the full service + city for a combo slug (used by the root resolver). */
export async function getServiceCity(slug: string): Promise<ServiceCityDetail | null> {
  const [services, cities] = await Promise.all([getServicesNav(), getCitiesNav()])
  const parsed = parseComboSlug(slug, services, cities)
  if (!parsed) return null

  const [service, city] = await Promise.all([
    getServiceBySlug(parsed.serviceSlug),
    getCityBySlug(parsed.citySlug),
  ])
  if (!service || !city) return null
  return { service, city }
}

export type ServiceCityCombo = { serviceSlug: string; citySlug: string; path: string }

/** Every valid service × city combo (for the sitemap). */
export async function listServiceCityCombos(): Promise<ServiceCityCombo[]> {
  const [services, cities] = await Promise.all([getServicesNav(), getCitiesNav()])
  const eligible = cities.filter(isEligibleCity)
  const combos: ServiceCityCombo[] = []
  for (const service of services) {
    for (const city of eligible) {
      combos.push({
        serviceSlug: service.slug,
        citySlug: city.slug,
        path: serviceCityPath(service.slug, city.slug),
      })
    }
  }
  return combos
}
