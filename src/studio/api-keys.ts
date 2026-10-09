import 'server-only'

import { query } from '@/db/client'
import { hashApiKey, hashesEqual, mintApiKey } from '@/lib/api-keys'
import { normalizeGrants, type ApiGrant } from '@/lib/api-scopes'

/** Admin API keys — storage. See db/migrations/20260918_api_keys.sql. */

export type ApiKeyRecord = {
  id: number
  name: string
  prefix: string
  scopes: ApiGrant[]
  createdByEmail: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export type ApiKeyStatus = 'active' | 'expired' | 'revoked'

export function apiKeyStatus(k: Pick<ApiKeyRecord, 'expiresAt' | 'revokedAt'>): ApiKeyStatus {
  if (k.revokedAt) return 'revoked'
  if (k.expiresAt && new Date(k.expiresAt).getTime() <= Date.now()) return 'expired'
  return 'active'
}

type Row = {
  id: number
  name: string
  prefix: string
  key_hash: string
  scopes: unknown
  created_by_email: string | null
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

const COLUMNS = `id, name, prefix, key_hash, scopes, created_by_email,
                 created_at, last_used_at, expires_at, revoked_at`

const toRecord = (r: Row): ApiKeyRecord => ({
  id: r.id,
  name: r.name,
  prefix: r.prefix,
  scopes: normalizeGrants(r.scopes),
  createdByEmail: r.created_by_email,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
  expiresAt: r.expires_at,
  revokedAt: r.revoked_at,
})

/** Postgres "relation does not exist" — the migration has not been applied. */
export const isMissingTable = (err: unknown): boolean =>
  (err as { code?: string })?.code === '42P01'

/** All keys, newest first — or `null` when the table is not installed yet. */
export async function getApiKeys(): Promise<ApiKeyRecord[] | null> {
  try {
    const rows = await query<Row>(`SELECT ${COLUMNS} FROM api_keys ORDER BY created_at DESC, id DESC`)
    return rows.map(toRecord)
  } catch (err) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/** Create a key. The returned `key` is the only time the secret exists in the clear. */
export async function createApiKey(input: {
  name: string
  scopes: ApiGrant[]
  expiresAt: Date | null
  createdBy: { id: number; email: string }
}): Promise<{ record: ApiKeyRecord; key: string }> {
  const minted = mintApiKey()
  const rows = await query<Row>(
    `INSERT INTO api_keys (name, prefix, key_hash, scopes, created_by, created_by_email, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      input.name,
      minted.prefix,
      minted.hash,
      JSON.stringify(input.scopes),
      input.createdBy.id,
      input.createdBy.email,
      input.expiresAt ? input.expiresAt.toISOString() : null,
    ],
  )
  return { record: toRecord(rows[0]), key: minted.key }
}

/** Revoke a key. Returns the record, or null if it did not exist / was already revoked. */
export async function revokeApiKey(id: number): Promise<ApiKeyRecord | null> {
  const rows = await query<Row>(
    `UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING ${COLUMNS}`,
    [id],
  )
  return rows[0] ? toRecord(rows[0]) : null
}

export type VerifiedKey =
  | { ok: true; record: ApiKeyRecord }
  | { ok: false; reason: 'unknown' | 'revoked' | 'expired' | 'not-installed' }

/** Look a presented key up by prefix and check its hash, revocation and expiry. */
export async function verifyApiKey(prefix: string, presented: string): Promise<VerifiedKey> {
  let row: Row | undefined
  try {
    ;[row] = await query<Row>(`SELECT ${COLUMNS} FROM api_keys WHERE prefix = $1 LIMIT 1`, [prefix])
  } catch (err) {
    if (isMissingTable(err)) return { ok: false, reason: 'not-installed' }
    throw err
  }
  // Hash even when there is no row, so an unknown prefix costs the same.
  const matches = hashesEqual(hashApiKey(presented), row?.key_hash ?? hashApiKey(''))
  if (!row || !matches) return { ok: false, reason: 'unknown' }

  const record = toRecord(row)
  const status = apiKeyStatus(record)
  if (status !== 'active') return { ok: false, reason: status }

  // Throttled, fire-and-forget — never slow or fail a request over bookkeeping.
  query(
    `UPDATE api_keys SET last_used_at = now()
     WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
    [record.id],
  ).catch(() => {})

  return { ok: true, record }
}
