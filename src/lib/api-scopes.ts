/**
 * Admin API scopes — what a key may be granted and what an endpoint asks for.
 * Client-safe: no Node, database or server imports, so the Studio key form, the
 * route handlers and the tests all share one definition.
 */

/** What the API manages. `cache` is the revalidate endpoint. */
export const API_RESOURCES = [
  'posts',
  'cities',
  'services',
  'testimonials',
  'leads',
  'redirects',
  'settings',
  'media',
  'audit',
  'cache',
] as const
export type ApiResource = (typeof API_RESOURCES)[number]

export const API_ACTIONS = ['read', 'write'] as const
export type ApiAction = (typeof API_ACTIONS)[number]

/** A concrete permission an endpoint asks for, e.g. `posts:write`. */
export type ApiScope = `${ApiResource}:${ApiAction}`

/**
 * What a key can be granted: a concrete scope, or a wildcard —
 * `posts:*` (everything on one resource), `*:read` (read everything), `*`.
 */
export type ApiGrant = ApiScope | `${ApiResource}:*` | `*:${ApiAction}` | '*'

export const API_RESOURCE_LABEL: Record<ApiResource, string> = {
  posts: 'Blog posts',
  cities: 'Service areas',
  services: 'Services',
  testimonials: 'Reviews',
  leads: 'Quote requests (customer data)',
  redirects: 'Redirects',
  settings: 'Business info',
  media: 'Media uploads',
  audit: 'Audit log',
  cache: 'Cache revalidation',
}

/** Starting points offered when creating a key. Scopes stay editable. */
export const API_KEY_PRESETS: { id: string; label: string; hint: string; grants: ApiGrant[] }[] = [
  {
    id: 'writer',
    label: 'Blog writer',
    hint: 'Publish and edit blog posts, upload hero images. Nothing else.',
    grants: ['posts:*', 'media:write'],
  },
  {
    id: 'content',
    label: 'Content manager',
    hint: 'All site content — posts, services, service areas, reviews — and cache.',
    grants: ['posts:*', 'cities:*', 'services:*', 'testimonials:*', 'media:write', 'cache:write'],
  },
  {
    id: 'leads-read',
    label: 'Leads — read only',
    hint: 'Export quote requests to a CRM or report. Cannot change anything.',
    grants: ['leads:read'],
  },
  {
    id: 'readonly',
    label: 'Read everything',
    hint: 'Read-only across the whole site, including customer data.',
    grants: ['*:read'],
  },
  {
    id: 'admin',
    label: 'Full admin',
    hint: 'Everything Studio can do. For a trusted agent only.',
    grants: ['*'],
  },
]

export function isApiGrant(v: unknown): v is ApiGrant {
  if (typeof v !== 'string') return false
  if (v === '*') return true
  const [resource, action, ...rest] = v.split(':')
  if (rest.length || !resource || !action) return false
  const resourceOk = resource === '*' || (API_RESOURCES as readonly string[]).includes(resource)
  const actionOk = action === '*' || (API_ACTIONS as readonly string[]).includes(action)
  // `*:*` is spelled `*`; refusing it keeps one canonical form per grant.
  return resourceOk && actionOk && !(resource === '*' && action === '*')
}

/** Keep only well-formed grants, de-duplicated, in a stable order. */
export function normalizeGrants(input: unknown): ApiGrant[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.filter(isApiGrant))].sort()
}

/** Does this set of grants allow `needed`? */
export function grantsAllow(grants: readonly string[], needed: ApiScope): boolean {
  const [resource, action] = needed.split(':')
  return grants.some(
    (g) => g === '*' || g === needed || g === `${resource}:*` || g === `*:${action}`,
  )
}
