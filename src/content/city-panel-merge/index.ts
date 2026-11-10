import type { RichTextData } from '@/db/types'
import type { PreviewOverride } from '@/content/preview-overrides'

import pages from './pages.json'

/**
 * Merged city panel-upgrade pages (drafted 2026-11-10; Haik asked to "take them both and make
 * it better", and approved go-live 2026-11-09 10:27 PM PT: "Yes"). Each kept URL (an existing
 * post) renders in the same compact layout as the live city pages, with content merged from
 * the retired template combo page. Title, meta description, H1, URL and hero image of the kept
 * post are NOT changed (generateMetadata still reads the post row).
 *
 * Live on production for exactly the four paths below. The retired combos 301 to these
 * pages via src/lib/seo-cleanup.ts (CITY_PANEL_MERGE_RETIRED). No DB writes.
 */
export const CITY_PANEL_MERGE_ENABLED = true

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
