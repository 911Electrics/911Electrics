import type { CityNav } from '@/db/types'

/**
 * Cross-page data fetchers (header/footer nav, service cards, city lists).
 *
 * These now delegate to the Payload-free DB layer (src/db/queries). The names
 * and shapes are kept stable so the consuming pages/components didn't need to
 * change as part of the Payload removal. Cache invalidation still works via the
 * same tags (`services`, `cities`, `testimonials`) the revalidation hooks bust.
 */
export {
  getServicesNav,
  getCitiesNav,
  getFeaturedTestimonials,
  getSiteSettings,
  getHomepage,
  getCityPageTemplate,
} from '@/db/queries'

/** Public URL path for a city document. */
export const cityPath = (city: Pick<CityNav, 'slug' | 'pathOverride'>): string =>
  city.pathOverride || `/${city.slug}/`
