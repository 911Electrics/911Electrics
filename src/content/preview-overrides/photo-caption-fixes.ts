import type { MediaImage } from '@/db/types'

/**
 * Photo / caption fixes for the 2026-11-10 audit. PREVIEW ONLY.
 *
 * Active solely when VERCEL_ENV === 'preview'. Production deploys (and local
 * `next start` / development) keep reading the live DB and live JSON captions.
 * No Supabase writes. Title, meta, URL, footer and the 5.0 Google badge are
 * not changed here.
 *
 * Haik approved a private preview (own words, 2026-11-10): fix captions so they
 * describe exactly what's in each photo; where the photo doesn't fit the page,
 * swap in a real job photo.
 */
export const PHOTO_CAPTION_FIXES_ENABLED = process.env.VERCEL_ENV === 'preview'

function jobPhoto(
  id: number,
  url: string,
  alt: string,
  width: number,
  height: number,
): MediaImage {
  return { id, alt, url, width, height, sizes: {} }
}

/** Alt-only fixes (same file, new wording). Keys are media.id. */
export const MEDIA_ALT_OVERRIDES: Record<number, string> = {
  // Clearly wrong — alt only (photo kept)
  101: 'Electrician working on a modern outdoor breaker panel',
  153: 'A generator cord being plugged into an outdoor power inlet',
  // Filename-slug alts, viewed and clearly accurate (listed separately in the preview report)
  42: 'Wall-mounted EV chargers at a home',
  28: 'Electrician working inside a breaker panel',
  29: 'A house with exposed, damaged electrical wiring and hazard warning signs',
  31: 'Electrician reviewing a panel beside a wall-mounted Level 2 EV charger',
  32: 'Electrician installing a Level 2 EV charger in a garage',
  33: 'Electrician installing a kitchen outlet',
  34: 'An electric car charging at a home',
  35: 'Electrician at a panel beside a wall-mounted EV charger',
  36: 'A wall-mounted EV charger and a car charging at a home',
  37: 'Electrician installing a Level 2 EV charger in a garage',
  39: 'Electrician inspecting a home electrical panel with a meter',
  41: 'Electrician in an attic checking old cloth-insulated wiring',
}

/** Blog post hero swaps, keyed by posts.slug. */
export const POST_HERO_OVERRIDES: Record<string, MediaImage> = {
  'signs-you-need-an-electrical-panel-upgrade-in-los-angeles': jobPhoto(
    900019,
    '/job-photos/la-fairfax-panel.webp',
    'A panel installed by our crew.',
    1200,
    1600,
  ),
  'complete-guide-ev-charger-installation-los-angeles': jobPhoto(
    900027,
    '/job-photos/emporia-ev-charger.webp',
    'An Emporia Level 2 EV charger, wired and mounted by our crew.',
    1600,
    1200,
  ),
  'do-federal-pacific-panels-need-to-be-replaced-los-angeles': jobPhoto(
    900060,
    '/job-photos/federal-pacific-stab-lok.webp',
    'A Federal Pacific Stab-Lok load center.',
    715,
    1168,
  ),
  'zinsco-panel-replacement-los-angeles': jobPhoto(
    900061,
    '/job-photos/la-north-hollywood-main-panel.webp',
    'A main panel installed by our crew.',
    1200,
    1600,
  ),
}

/** Service hero swaps, keyed by services.slug. Does not change house-rewiring (media 46 stays there). */
export const SERVICE_HERO_OVERRIDES: Record<string, MediaImage> = {
  'ev-charger-installation-los-angeles-ca': jobPhoto(
    900035,
    '/job-photos/la-north-hills-ev-charger.webp',
    'An Autel Level 2 EV charger, wired and mounted by our crew.',
    1600,
    1200,
  ),
}

export function applyMediaAltOverride(image: MediaImage): MediaImage {
  if (!PHOTO_CAPTION_FIXES_ENABLED) return image
  const alt = MEDIA_ALT_OVERRIDES[image.id]
  return alt !== undefined ? { ...image, alt } : image
}

export function applyPostHeroOverride(
  slug: string,
  hero: MediaImage | null,
  metaImage: MediaImage | null = null,
): { hero: MediaImage | null; metaImage: MediaImage | null } {
  if (!PHOTO_CAPTION_FIXES_ENABLED) return { hero, metaImage }
  const next = POST_HERO_OVERRIDES[slug]
  if (!next) return { hero, metaImage }
  const replaceMeta = Boolean(hero && metaImage && hero.id === metaImage.id)
  return { hero: next, metaImage: replaceMeta ? next : metaImage }
}

export function applyServiceHeroOverride(slug: string, hero: MediaImage | null): MediaImage | null {
  if (!PHOTO_CAPTION_FIXES_ENABLED) return hero
  return SERVICE_HERO_OVERRIDES[slug] ?? hero
}
