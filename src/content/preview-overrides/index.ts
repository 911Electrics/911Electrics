import type { RichTextData } from '@/db/types'

import pages from './pages.json'

export type PreviewReview = { quote: string; name: string; source: string }
export type PreviewOverride = {
  metaTitle: string
  metaDescription: string
  heroHeading: string
  heroSubheading: string | null
  trustPromise: string | null
  intro: RichTextData
  reviews: PreviewReview[]
  faqs: { question: string; answer: RichTextData }[]
}

/**
 * Draft page content for review on Vercel PREVIEW deployments only.
 *
 * Preview and production share one database, so draft copy lives here in the
 * repo instead of in the cities/services rows. It is applied only when
 * VERCEL_ENV === 'preview' and never on the main branch, so merging this code
 * cannot change production pages. To go live, move the content into the DB rows.
 */
export function getPreviewOverride(path: string): PreviewOverride | null {
  if (process.env.VERCEL_ENV !== 'preview') return null
  if (process.env.VERCEL_GIT_COMMIT_REF === 'main') return null
  return (pages as unknown as Record<string, PreviewOverride>)[path] ?? null
}
