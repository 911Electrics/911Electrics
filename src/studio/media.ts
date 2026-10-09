import 'server-only'

import { query } from '@/db/client'

export type MediaItem = {
  id: number
  alt: string | null
  /** Full-size static path (/media/<filename>). */
  url: string
  /** Thumbnail path for grids (falls back to full size). */
  thumb: string
}

const path = (filename: string | null): string | null => (filename ? `/media/${filename}` : null)
const isAbsolute = (u: string | null): u is string => !!u && /^https?:\/\//i.test(u)

export async function getAllMedia(): Promise<MediaItem[]> {
  const rows = await query<{
    id: number
    alt: string | null
    url: string | null
    filename: string | null
    sizes_thumbnail_filename: string | null
    sizes_small_filename: string | null
  }>(
    `SELECT id, alt, url, filename, sizes_thumbnail_filename, sizes_small_filename
     FROM media ORDER BY created_at DESC`,
  )
  return rows.map((r) => {
    if (isAbsolute(r.url)) {
      return { id: r.id, alt: r.alt, url: r.url, thumb: r.url }
    }
    const url = path(r.filename) ?? ''
    return {
      id: r.id,
      alt: r.alt,
      url,
      thumb: path(r.sizes_thumbnail_filename) ?? path(r.sizes_small_filename) ?? url,
    }
  })
}
