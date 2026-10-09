'use server'

import { revalidatePath } from 'next/cache'

import { query } from '@/db/client'
import { IMAGE_TYPES_LABEL, sniffImageType, withImageExtension } from '@/lib/image-sniff'
import {
  supabaseStorageConfigured,
  uniqueObjectName,
  uploadToMediaBucket,
} from '@/lib/supabase-storage'
import { can, getStudioUser } from '@/studio/auth'
import type { MediaItem } from '@/studio/media'

export type UploadResult = { ok: true; item: MediaItem } | { ok: false; error: string }

const MAX_BYTES = 8 * 1024 * 1024

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const user = await getStudioUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  // Uploads land in a public bucket and are only offered by the content forms.
  if (!can(user, 'content')) return { ok: false, error: 'Not allowed' }

  if (!supabaseStorageConfigured()) {
    return {
      ok: false,
      error:
        'Image uploads aren’t enabled yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and redeploy.',
    }
  }

  const file = formData.get('file')
  const alt = String(formData.get('alt') ?? '').trim()

  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose an image to upload.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Image is too large (max 8 MB).' }
  if (!alt) {
    return { ok: false, error: 'Add alt text describing the image (for accessibility and SEO).' }
  }

  // `file.type` is whatever the client says it is. Decide from the bytes, and
  // store under the type and extension we detected.
  const bytes = Buffer.from(await file.arrayBuffer())
  const type = sniffImageType(bytes)
  if (!type) return { ok: false, error: `That file is not a supported image. Use ${IMAGE_TYPES_LABEL}.` }

  const objectName = uniqueObjectName(withImageExtension(file.name, type))
  let url: string
  try {
    url = await uploadToMediaBucket(objectName, bytes, type)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Upload failed.' }
  }

  const rows = await query<{ id: number }>(
    `INSERT INTO media (alt, url, filename, mime_type, filesize, updated_at, created_at)
     VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id`,
    [alt, url, objectName, type, bytes.length],
  )

  revalidatePath('/studio')
  return { ok: true, item: { id: rows[0].id, alt, url, thumb: url } }
}
