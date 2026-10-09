import type { ApiScope } from '@/lib/api-scopes'

/**
 * The admin API, described as data. `GET /api/admin/v1` serves this (annotated
 * with what the caller's key may do), so an agent can discover the API instead
 * of being told about it, and tests/int/api-catalog.int.spec.ts checks it
 * against the route files on disk so it cannot drift from what is deployed.
 *
 * Paths are relative to /api/admin/v1. `legacy` is the pre-v1 URL that still
 * works as an alias.
 */

export const API_BASE = '/api/admin/v1'

export type ApiOperation = { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; scope: ApiScope; summary: string }
export type ApiEndpoint = { path: string; legacy?: string; operations: ApiOperation[] }

const crud = (
  resource: 'posts' | 'cities' | 'services' | 'testimonials',
  noun: string,
  legacy: { collection: string; item: string },
  extra?: { list?: string; create?: string; update?: string },
): ApiEndpoint[] => [
  {
    path: `/${resource}`,
    legacy: legacy.collection,
    operations: [
      { method: 'GET', scope: `${resource}:read`, summary: extra?.list ?? `List ${noun}s.` },
      { method: 'POST', scope: `${resource}:write`, summary: extra?.create ?? `Create a ${noun}.` },
    ],
  },
  {
    path: `/${resource}/{id}`,
    legacy: legacy.item,
    operations: [
      { method: 'GET', scope: `${resource}:read`, summary: `Fetch one ${noun}.` },
      { method: 'PATCH', scope: `${resource}:write`, summary: extra?.update ?? `Update a ${noun}; only the fields sent change.` },
      { method: 'DELETE', scope: `${resource}:write`, summary: `Delete a ${noun}.` },
    ],
  },
]

export const API_CATALOG: ApiEndpoint[] = [
  ...crud(
    'posts',
    'blog post',
    { collection: '/api/blog/publish', item: '/api/blog/posts/{id}' },
    {
      list: 'List posts, newest first. ?limit= (max 200) and ?offset= page the archive.',
      create:
        'Publish a post from Markdown or Lexical. Internal links to service and city pages are added automatically.',
      update:
        'Update a post. {"relink": true} re-runs internal linking on the stored body; add "dryRun": true to preview.',
    },
  ),
  ...crud('cities', 'service area', {
    collection: '/api/content/cities',
    item: '/api/content/cities/{id}',
  }),
  ...crud('services', 'service', {
    collection: '/api/content/services',
    item: '/api/content/services/{id}',
  }),
  ...crud('testimonials', 'review', {
    collection: '/api/content/testimonials',
    item: '/api/content/testimonials/{id}',
  }),
  {
    path: '/leads',
    legacy: '/api/leads',
    operations: [
      {
        method: 'GET',
        scope: 'leads:read',
        summary:
          'Export quote requests (customer data). ?status= ?search= ?format=json|csv, max 200 rows.',
      },
    ],
  },
  {
    path: '/revalidate',
    legacy: '/api/revalidate',
    operations: [
      {
        method: 'POST',
        scope: 'cache:write',
        summary:
          'Flush cached content after editing the database directly. {"tags": [...]} or empty for everything.',
      },
    ],
  },
]
