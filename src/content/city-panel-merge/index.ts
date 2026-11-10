import type { RichTextData } from '@/db/types'
import type { PreviewOverride } from '@/content/preview-overrides'

import pages from './pages.json'

/**
 * PREVIEW ONLY (drafted 2026-11-10 for Haik's review; he asked to "take them both and make
 * it better"). Merged city panel-upgrade pages: each kept URL (an existing post) renders
 * in the same compact layout as the live city pages, with content merged from the retired
 * template combo page. Title, meta description, H1, URL and hero image of the kept post are
 * NOT changed (generateMetadata still reads the post row).
 *
 * Gated to Vercel preview deployments: on production (VERCEL_ENV=production) and in local
 * dev this returns null, so 911electrics.com keeps rendering the published posts unchanged.
 * No DB writes. No redirects are added here; the 301s are a separate, approval-gated change.
 */
export const CITY_PANEL_MERGE_ENABLED = process.env.VERCEL_ENV === 'preview'

export const CITY_PANEL_MERGE_PATHS: Record<string, { city: string; hubPath: string }> = {
  '/electrician-pasadena-ca-panel-upgrades/': {
    city: 'Pasadena',
    hubPath: '/electrician-pasadena-ca/',
  },
  '/electrician-altadena-ca-panel-upgrades/': {
    city: 'Altadena',
    hubPath: '/electrician-altadena-ca/',
  },
  '/electrician-glendale-ca-panel-upgrades-ev-chargers/': {
    city: 'Glendale',
    hubPath: '/electrician-glendale-ca/',
  },
  '/electrician-burbank-ca-panel-upgrades-ev-chargers/': {
    city: 'Burbank',
    hubPath: '/electrician-burbank-ca/',
  },
}

type MergeDraft = Omit<
  PreviewOverride,
  'layout' | 'metaTitle' | 'metaDescription' | 'heroHeading' | 'trustPromise'
> & { lateHeading: string; lateBlocks: { heading: string; body: RichTextData }[] }

export function getCityPanelMerge(
  path: string,
): { city: string; hubPath: string; draft: MergeDraft } | null {
  if (!CITY_PANEL_MERGE_ENABLED) return null
  const info = CITY_PANEL_MERGE_PATHS[path]
  const draft = (pages as unknown as Record<string, MergeDraft>)[path]
  if (!info || !draft) return null
  return { ...info, draft }
}
