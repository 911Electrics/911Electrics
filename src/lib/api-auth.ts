import crypto from 'crypto'

import { NextResponse } from 'next/server'

import { parseApiKeyPrefix } from '@/lib/api-keys'
import { grantsAllow, type ApiGrant, type ApiScope } from '@/lib/api-scopes'
import { verifyApiKey } from '@/studio/api-keys'

/**
 * Auth for the admin API (`/api/admin/v1/*` and the legacy aliases) and the
 * cron workers.
 *
 * Every endpoint states the one scope it needs — `authorize(req, 'posts:write')`
 * — and a caller is let in only if its credential grants it. Two kinds of
 * credential are accepted:
 *
 *   1. A managed key (`e911_…`), created in Studio → API keys with a name, a set
 *      of scopes and an optional expiry, and revocable instantly. Writes are
 *      recorded in the audit log under the key's name.
 *   2. The original env-var tokens, kept so nothing breaks on deploy. They act
 *      as fixed-scope legacy keys: BLOG_API_TOKEN is a content key, and
 *      LEADS_API_TOKEN (when set) is the only token that may read leads.
 *
 * Everything FAILS CLOSED: no credential, an unknown one, a missing scope or an
 * unconfigured secret all refuse. An unset env var never means "open".
 *
 * Usage in a route handler:
 *   const auth = await authorize(req, 'posts:write')
 *   if (!auth.ok) return auth.response
 *   … logAudit('post.create', { actor: auth.actor, … })
 */

/** Actor recorded in the audit log for API-driven writes. */
export type ApiActor = { id: null; email: string }

export type ApiIdentity = {
  actor: ApiActor
  /** Display name — the managed key's name, or the legacy token's label. */
  keyName: string
  grants: ApiGrant[]
  /** True for the env-var tokens; false for a Studio-managed key. */
  legacy: boolean
}

export type ApiAuthResult = ({ ok: true } & ApiIdentity) | { ok: false; response: NextResponse }

const deny = (status: number, body: Record<string, unknown>): ApiAuthResult => ({
  ok: false,
  response: NextResponse.json(body, { status }),
})

const bearerOf = (req: Request): string | undefined =>
  /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')?.[1]?.trim()

function secretsEqual(provided: string, secret: string | undefined): boolean {
  if (!secret) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * What the env-var tokens may do. BLOG_API_TOKEN is the token the external blog
 * writer holds, so it is a content key and nothing more — except that it keeps
 * reading leads until LEADS_API_TOKEN is set, because that is how it behaved
 * before and a deploy must not break an existing integration.
 */
function legacyIdentity(provided: string): ApiIdentity | null {
  if (secretsEqual(provided, process.env.LEADS_API_TOKEN)) {
    return {
      actor: { id: null, email: 'leads-api' },
      keyName: 'LEADS_API_TOKEN',
      grants: ['leads:read'],
      legacy: true,
    }
  }
  if (secretsEqual(provided, process.env.BLOG_API_TOKEN)) {
    const grants: ApiGrant[] = [
      'posts:*',
      'cities:*',
      'services:*',
      'testimonials:*',
      'media:write',
      'cache:write',
    ]
    if (!process.env.LEADS_API_TOKEN) grants.push('leads:read')
    return {
      actor: { id: null, email: 'blog-api' },
      keyName: 'BLOG_API_TOKEN',
      grants,
      legacy: true,
    }
  }
  return null
}

/** Identify the caller without asking for a particular scope. */
export async function authenticate(req: Request): Promise<ApiAuthResult> {
  const provided = bearerOf(req) ?? req.headers.get('x-api-key')?.trim() ?? ''
  if (!provided) {
    return deny(401, {
      error: 'Unauthorized',
      hint: 'Send "Authorization: Bearer <key>". Keys are created in Studio → API keys.',
    })
  }

  const prefix = parseApiKeyPrefix(provided)
  if (prefix) {
    const verified = await verifyApiKey(prefix, provided)
    if (verified.ok) {
      const { record } = verified
      return {
        ok: true,
        actor: { id: null, email: `api:${record.name}` },
        keyName: record.name,
        grants: record.scopes,
        legacy: false,
      }
    }
    if (verified.reason === 'not-installed') {
      return deny(503, {
        error: 'API keys are not installed. Apply db/migrations/20260918_api_keys.sql.',
      })
    }
    // Say *why* for a key that was once valid — an agent told only
    // "unauthorized" retries forever; a revoked key should stop.
    return deny(401, {
      error: verified.reason === 'unknown' ? 'Unauthorized' : `This API key is ${verified.reason}.`,
    })
  }

  const legacy = legacyIdentity(provided)
  return legacy ? { ok: true, ...legacy } : deny(401, { error: 'Unauthorized' })
}

/** Identify the caller and require one scope. */
export async function authorize(req: Request, scope: ApiScope): Promise<ApiAuthResult> {
  const auth = await authenticate(req)
  if (!auth.ok) return auth
  if (!grantsAllow(auth.grants, scope)) {
    return deny(403, {
      error: `This key does not have the "${scope}" scope.`,
      required: scope,
      granted: auth.grants,
    })
  }
  return auth
}

/**
 * Cron workers. Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled
 * invocations when the variable is set. These used to check the header only
 * `if (secret)`, so a missing variable made them public: anyone could publish
 * scheduled posts early or trigger the follow-up email batch.
 */
export function requireCronSecret(
  req: Request,
): { ok: true } | { ok: false; response: NextResponse } {
  if (!process.env.CRON_SECRET) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not configured. Set CRON_SECRET.' }, { status: 503 }),
    }
  }
  if (!secretsEqual(bearerOf(req) ?? '', process.env.CRON_SECRET)) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true }
}
