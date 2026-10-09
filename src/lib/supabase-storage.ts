import 'server-only'

import { randomBytes } from 'crypto'

/**
 * Upload media to the Supabase Storage `media` bucket via the Storage REST API.
 *
 * Server-only. Uses the service-role key (RLS-bypassing) over plain fetch — no
 * extra SDK dependency. The bucket is public, so the returned URL is directly
 * servable (and allowed in next.config image remotePatterns).
 *
 * Required env:
 *   SUPABASE_URL               e.g. https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  the project's service_role secret
 */
const BUCKET = 'media'

export function supabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/** A collision-resistant object name that preserves the file extension. */
export function uniqueObjectName(filename: string): string {
  const safe = (filename || 'image').replace(/[^a-zA-Z0-9._-]/g, '-')
  const rand = randomBytes(6).toString('hex')
  const dot = safe.lastIndexOf('.')
  if (dot > 0) return `${safe.slice(0, dot)}-${rand}${safe.slice(dot)}`
  return `${safe}-${rand}`
}

/** Upload bytes and return the public URL. Throws on any failure. */
export async function uploadToMediaBucket(
  objectName: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) {
    throw new Error('Supabase Storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).')
  }

  const path = `${BUCKET}/${objectName}`
  const res = await fetch(`${base}/storage/v1/object/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': contentType,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Storage upload failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  return `${base}/storage/v1/object/public/${path}`
}
