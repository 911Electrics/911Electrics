import type { RichTextData } from '@/db/types'
import { markdownToLexical } from '@/lib/markdown-to-lexical'

import pages from './pages.json'
import previewDrafts from './preview-drafts.json'
import cityRewritesEncinoEagleRock from './city-rewrites-encino-eagle-rock.json'

export type PreviewReview = { quote: string; name: string; source: string }
export type PreviewOverride = {
  layout: 'compact'
  metaTitle: string
  metaDescription: string
  heroHeading: string
  heroSubheading: string
  trustPromise: string | null
  photos: { url: string; caption: string; width: number; height: number }[]
  reviews: PreviewReview[]
  blocks: { heading: string; body: RichTextData }[]
  faqs: { question: string; answer: RichTextData }[]
  /** Optional second block group rendered after reviews (city panel-merge previews only). */
  lateHeading?: string
  lateBlocks?: { heading: string; body: RichTextData }[]
}

/**
 * Code-managed page content for exactly these four paths (approved by Haik,
 * 2026-10-20). Content lives in the repo rather than the shared cities/services
 * rows so the change is versioned and rolls back with a deploy/revert, with no
 * DB writes. Every other path returns null and keeps rendering from the DB.
 * To update reviews/copy: edit 911-audit/build/reviews.py / v2.py, regenerate
 * pages.json, open a PR.
 */
export const LIVE_OVERRIDE_PATHS = [
  '/electrician-pasadena-ca/',
  '/electrician-burbank-ca/',
  '/services/los-angeles-ca/',
  '/emergency-electrician-los-angeles-ca/',
  // Round 2, go-live approved by Haik 2026-11-03 9:59 AM PT.
  '/electrician-glendale-ca/',
  '/electrician-altadena-ca/',
  '/electrician-arcadia-ca/',
  // Round 3, go-live approved by Haik 2026-11-09 10:20 PM PT ("Yes"). Content lives in
  // city-rewrites-encino-eagle-rock.json.
  '/electrician-encino-ca/',
  '/electrician-eagle-rock-ca/',
] as const

type DraftSpec = {
  blocks: ({ keep: string } | { heading: string; md: string })[]
  faqs: ({ keep: string } | { question: string; md: string })[]
}

/**
 * Service-page copy (drafted 2026-11-08, go-live approved by Haik 2026-11-09 "Publish"):
 * a path listed in preview-drafts.json gets its block/FAQ list rebuilt from that spec
 * ("keep" = reuse the block/FAQ from pages.json verbatim, otherwise Markdown copy). Same
 * PreviewCompactPage structure, photos, reviews, meta and hero.
 */
function applyPreviewDraft(path: string, live: PreviewOverride): PreviewOverride {
  const spec = (previewDrafts as unknown as Record<string, DraftSpec>)[path]
  if (!spec) return live
  const blocks = spec.blocks.map((b) => {
    if ('keep' in b) {
      const found = live.blocks.find((x) => x.heading === b.keep)
      if (!found) throw new Error(`preview draft: missing live block "${b.keep}"`)
      return found
    }
    return { heading: b.heading, body: markdownToLexical(b.md) }
  })
  const faqs = spec.faqs.map((f) => {
    if ('keep' in f) {
      const found = live.faqs.find((x) => x.question === f.keep)
      if (!found) throw new Error(`preview draft: missing live FAQ "${f.keep}"`)
      return found
    }
    return { question: f.question, answer: markdownToLexical(f.md) }
  })
  return { ...live, blocks, faqs }
}

/**
 * Encino + Eagle Rock city page rewrites (previews built 2026-11-09; go-live approved by
 * Haik 2026-11-09 10:20 PM PT). Kept in their own JSON file so they merge cleanly with
 * other branches. Served only for paths listed in LIVE_OVERRIDE_PATHS.
 * Title/meta for these pages still come from the cities table (buildMeta).
 */
const CITY_REWRITES_ENCINO_EAGLE_ROCK =
  cityRewritesEncinoEagleRock as unknown as Record<string, PreviewOverride>

export function getPreviewOverride(path: string): PreviewOverride | null {
  if (!(LIVE_OVERRIDE_PATHS as readonly string[]).includes(path)) return null
  const live =
    (pages as unknown as Record<string, PreviewOverride>)[path] ??
    CITY_REWRITES_ENCINO_EAGLE_ROCK[path] ??
    null
  return live ? applyPreviewDraft(path, live) : null
}
