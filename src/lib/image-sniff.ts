/**
 * Decide what an uploaded file *is* from its bytes, not from what it claims.
 *
 * Both upload paths used to trust a label: Studio trusted `file.type`, which the
 * browser — or anyone posting to the action directly — sets freely, and the API
 * trusted the remote server's `Content-Type`. Whatever passed was stored in a
 * public bucket and served back under that same label. Sniffing the magic bytes
 * means the stored content-type is one we determined, and a file that is not
 * really an image is refused regardless of its name or label.
 *
 * SVG is deliberately not accepted. It is a document format that can carry
 * script, it cannot be recognised by magic bytes, and it could never be
 * displayed anyway: every image here renders through `next/image`, which
 * refuses remote SVG unless `dangerouslyAllowSVG` is set. Allowing the upload
 * offered a broken feature and a stored-script risk for nothing.
 *
 * Pure and dependency-free.
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const
export type ImageType = (typeof IMAGE_TYPES)[number]

export const IMAGE_EXTENSION: Record<ImageType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
}

/** Human-readable list for error messages. */
export const IMAGE_TYPES_LABEL = 'JPG, PNG, WebP, AVIF or GIF'

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const startsWith = (bytes: Uint8Array, signature: number[]): boolean =>
  bytes.length >= signature.length && signature.every((b, i) => bytes[i] === b)

/** The image type these bytes actually are, or null if they are not one we accept. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'

  if (bytes.length >= 6) {
    const head = ascii(bytes, 0, 6)
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'
  }

  // RIFF....WEBP
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'image/webp'
  }

  // ISO-BMFF: a `ftyp` box whose major or compatible brands include avif/avis.
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === 'ftyp') {
    const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
    const end = Math.min(bytes.length, Math.max(16, boxSize), 64)
    for (let at = 8; at + 4 <= end; at += 4) {
      // Bytes 12–15 are the minor version, not a brand.
      if (at === 12) continue
      const brand = ascii(bytes, at, 4)
      if (brand === 'avif' || brand === 'avis') return 'image/avif'
    }
  }

  return null
}

/**
 * A stored object name whose extension matches the detected type, so the name,
 * the stored content-type and the bytes can never disagree ("photo.html" that
 * is really a PNG becomes "photo.png").
 */
export function withImageExtension(filename: string, type: ImageType): string {
  const base = (filename || 'image').replace(/\.[^./\\]*$/, '') || 'image'
  return `${base}${IMAGE_EXTENSION[type]}`
}
