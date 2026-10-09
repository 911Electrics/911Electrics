import { NextResponse } from 'next/server'

import { authenticate } from '@/lib/api-auth'
import { API_BASE, API_CATALOG } from '@/lib/api-catalog'
import { grantsAllow } from '@/lib/api-scopes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The API describes itself: every endpoint, the scope each operation needs, and
 * whether the key making this request has it. Any valid key may call this — it
 * reveals the shape of the API, never any content.
 */
export async function GET(req: Request) {
  const auth = await authenticate(req)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    name: '911 Electrics admin API',
    version: 'v1',
    base: API_BASE,
    key: { name: auth.keyName, managed: !auth.legacy, grants: auth.grants },
    conventions: {
      auth: 'Authorization: Bearer <key> (or x-api-key). Keys are created in Studio → API keys.',
      errors:
        '401 unknown/revoked/expired key · 403 key lacks the scope (body names it) · 404 · 409 slug conflict · 422 validation (body lists fields).',
      writes:
        'Go live within seconds (cache is revalidated for you) and are recorded in the Studio audit log under the key name.',
      seo: 'Titles, H1s and slugs of existing pages are load-bearing for search rankings — do not change them as a side effect.',
    },
    endpoints: API_CATALOG.map((e) => ({
      path: `${API_BASE}${e.path}`,
      legacyAlias: e.legacy ?? null,
      operations: e.operations.map((op) => ({ ...op, allowed: grantsAllow(auth.grants, op.scope) })),
    })),
  })
}
