import type { RichTextData } from '@/db/types'

import pages from './pages.json'

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
] as const

/**
 * Round 2 (Glendale, Altadena, Arcadia; Haik OK'd building previews 2026-11-03).
 * PREVIEW ONLY: these render from pages.json only on Vercel preview deployments,
 * never on production, until Haik approves go-live.
 */
export const PREVIEW_ONLY_OVERRIDE_PATHS = [
  '/electrician-glendale-ca/',
  '/electrician-altadena-ca/',
  '/electrician-arcadia-ca/',
] as const

export function getPreviewOverride(path: string): PreviewOverride | null {
  const isLive = (LIVE_OVERRIDE_PATHS as readonly string[]).includes(path)
  const isPreview =
    process.env.VERCEL_ENV === 'preview' &&
    (PREVIEW_ONLY_OVERRIDE_PATHS as readonly string[]).includes(path)
  if (!isLive && !isPreview) return null
  return (pages as unknown as Record<string, PreviewOverride>)[path] ?? null
}
