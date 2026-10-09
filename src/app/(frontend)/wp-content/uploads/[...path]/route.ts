import { existsSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

/**
 * Legacy WordPress media URLs: /wp-content/uploads/<y>/<m>/<file> 301s to
 * the migrated copy in /media/<file>. WP size-suffixed variants
 * (foo-300x200.jpg) and -scaled fall back to the original file.
 */
const MEDIA_DIR = path.resolve(process.cwd(), 'public', 'media')

const safe = (name: string) => /^[\w.\-() ]+$/.test(name) && !name.includes('..')

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params
  const filename = decodeURIComponent(segments[segments.length - 1] ?? '')

  if (!filename || !safe(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stripped = filename
    .replace(/-\d+x\d+(\.\w+)$/, '$1') // strip WP size suffix
    .replace(/-scaled(\.\w+)$/, '$1')

  // WP generated .jpg/.webp thumbnails for .avif/.png sources — try the
  // same basename under every extension we migrated
  const base = stripped.replace(/\.\w+$/, '')
  const candidates = [
    filename,
    stripped,
    ...['.avif', '.webp', '.jpg', '.jpeg', '.png', '.svg'].map((ext) => `${base}${ext}`),
  ]

  for (const candidate of candidates) {
    if (safe(candidate) && existsSync(path.join(MEDIA_DIR, candidate))) {
      return NextResponse.redirect(new URL(`/media/${candidate}`, _req.url), 301)
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
