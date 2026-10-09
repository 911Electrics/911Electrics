import 'server-only'

import { query } from '@/db/client'
import { IMAGE_TYPES_LABEL, sniffImageType, withImageExtension } from '@/lib/image-sniff'
import { downloadPublicFile, UnsafeUrlError } from '@/lib/safe-download'
import {
  supabaseStorageConfigured,
  uniqueObjectName,
  uploadToMediaBucket,
} from '@/lib/supabase-storage'

const MAX_BYTES = 8 * 1024 * 1024

/**
 * Download an image from a public URL, store it in Supabase Storage, and create
 * a `media` row — returning the new media id. Used by the API so callers can give
 * a post a hero image by URL (e.g. an AI-generated cover) without a manual upload.
 *
 * The URL comes from an API caller, so the download goes through
 * `downloadPublicFile` (https only, public addresses only, checked at connect
 * time, redirects re-checked, size-capped while streaming), and the stored type
 * is decided from the bytes, not from the remote server's Content-Type header.
 *
 * Throws on any problem (caller decides whether that's fatal).
 */
export async function ingestImageFromUrl(url: string, alt: string): Promise<number> {
  if (!supabaseStorageConfigured()) {
    throw new Error('Media uploads are not enabled (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).')
  }

  let bytes: Buffer
  let finalUrl: string
  try {
    ;({ bytes, finalUrl } = await downloadPublicFile(url, { maxBytes: MAX_BYTES }))
  } catch (err) {
    // Refusals and our own size/timeout errors are safe to show. Anything else
    // (DNS, TLS, socket) is reported generically so error text cannot be used
    // to probe what the server can reach.
    if (err instanceof UnsafeUrlError) throw err
    const message = err instanceof Error ? err.message : ''
    if (/^(Image is too large|Timed out|Too many redirects|Could not download the image \(HTTP)/.test(message)) {
      throw new Error(message.replace('Image is too large.', 'Image is too large (max 8 MB).'))
    }
    throw new Error('Could not download the image URL.')
  }

  if (bytes.length === 0) throw new Error('The image URL returned no data.')
  const type = sniffImageType(bytes)
  if (!type) throw new Error(`That URL is not a supported image. Use ${IMAGE_TYPES_LABEL}.`)

  const rawName = decodeURIComponent(new URL(finalUrl).pathname.split('/').pop() || 'image')
  const objectName = uniqueObjectName(withImageExtension(rawName, type))
  const publicUrl = await uploadToMediaBucket(objectName, bytes, type)

  const rows = await query<{ id: number }>(
    `INSERT INTO media (alt, url, filename, mime_type, filesize, updated_at, created_at)
     VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id`,
    [alt.trim() || objectName, publicUrl, objectName, type, bytes.length],
  )
  return rows[0].id
}
