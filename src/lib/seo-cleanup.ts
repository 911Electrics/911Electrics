/**
 * SEO cleanup, round 1 (approved by Haik 2026-10-10 15:32 PT; plan:
 * /workspace/911-takeover/cleanup-plan-2026-10-10.md).
 *
 * 1. 68 programmatic service×city pages for the 13 San Gabriel Valley cities
 *    (added 2026-09-01, zero search traction) are retired: 301 to their city hub,
 *    dropped from the sitemap and from internal links.
 * 2. 40 legacy (Wix / WordPress / construction-era / old post) URLs 301 to the
 *    closest live page.
 *
 * Pure data, no DB/server imports: used by redirects.ts (build), the sitemap,
 * the city/service-city templates and the [slug] resolver.
 */

type Redirect301 = { source: string; destination: string }

/** Retired combo path -> city hub path. Round 1: SGV only. Other combos are untouched. */
export const RETIRED_COMBOS: Readonly<Record<string, string>> = {
  '/electrical-panel-upgrades-baldwin-park-ca/': '/electrician-baldwin-park-ca/',
  '/electrical-panel-upgrades-monrovia-ca/': '/electrician-monrovia-ca/',
  '/electrical-panel-upgrades-montebello-ca/': '/electrician-montebello-ca/',
  '/electrical-panel-upgrades-monterey-park-ca/': '/electrician-monterey-park-ca/',
  '/electrical-panel-upgrades-rosemead-ca/': '/electrician-rosemead-ca/',
  '/electrical-panel-upgrades-san-gabriel-ca/': '/electrician-san-gabriel-ca/',
  '/electrical-panel-upgrades-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/electrical-panel-upgrades-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/electrical-repairs-alhambra-ca/': '/electrician-alhambra-ca/',
  '/electrical-repairs-duarte-ca/': '/electrician-duarte-ca/',
  '/electrical-repairs-el-monte-ca/': '/electrician-el-monte-ca/',
  '/electrical-repairs-monrovia-ca/': '/electrician-monrovia-ca/',
  '/electrical-repairs-monterey-park-ca/': '/electrician-monterey-park-ca/',
  '/electrical-repairs-san-gabriel-ca/': '/electrician-san-gabriel-ca/',
  '/electrical-repairs-san-marino-ca/': '/electrician-san-marino-ca/',
  '/electrical-repairs-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/electrical-repairs-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/electrical-repairs-temple-city-ca/': '/electrician-temple-city-ca/',
  '/emergency-electrician-alhambra-ca/': '/electrician-alhambra-ca/',
  '/emergency-electrician-baldwin-park-ca/': '/electrician-baldwin-park-ca/',
  '/emergency-electrician-duarte-ca/': '/electrician-duarte-ca/',
  '/emergency-electrician-el-monte-ca/': '/electrician-el-monte-ca/',
  '/emergency-electrician-monrovia-ca/': '/electrician-monrovia-ca/',
  '/emergency-electrician-montebello-ca/': '/electrician-montebello-ca/',
  '/emergency-electrician-monterey-park-ca/': '/electrician-monterey-park-ca/',
  '/emergency-electrician-rosemead-ca/': '/electrician-rosemead-ca/',
  '/emergency-electrician-san-gabriel-ca/': '/electrician-san-gabriel-ca/',
  '/emergency-electrician-san-marino-ca/': '/electrician-san-marino-ca/',
  '/emergency-electrician-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/emergency-electrician-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/emergency-electrician-temple-city-ca/': '/electrician-temple-city-ca/',
  '/ev-charger-installation-alhambra-ca/': '/electrician-alhambra-ca/',
  '/ev-charger-installation-baldwin-park-ca/': '/electrician-baldwin-park-ca/',
  '/ev-charger-installation-duarte-ca/': '/electrician-duarte-ca/',
  '/ev-charger-installation-el-monte-ca/': '/electrician-el-monte-ca/',
  '/ev-charger-installation-monrovia-ca/': '/electrician-monrovia-ca/',
  '/ev-charger-installation-montebello-ca/': '/electrician-montebello-ca/',
  '/ev-charger-installation-rosemead-ca/': '/electrician-rosemead-ca/',
  '/ev-charger-installation-san-marino-ca/': '/electrician-san-marino-ca/',
  '/ev-charger-installation-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/ev-charger-installation-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/ev-charger-installation-temple-city-ca/': '/electrician-temple-city-ca/',
  '/lighting-installation-upgrades-alhambra-ca/': '/electrician-alhambra-ca/',
  '/lighting-installation-upgrades-baldwin-park-ca/': '/electrician-baldwin-park-ca/',
  '/lighting-installation-upgrades-duarte-ca/': '/electrician-duarte-ca/',
  '/lighting-installation-upgrades-el-monte-ca/': '/electrician-el-monte-ca/',
  '/lighting-installation-upgrades-monrovia-ca/': '/electrician-monrovia-ca/',
  '/lighting-installation-upgrades-montebello-ca/': '/electrician-montebello-ca/',
  '/lighting-installation-upgrades-monterey-park-ca/': '/electrician-monterey-park-ca/',
  '/lighting-installation-upgrades-rosemead-ca/': '/electrician-rosemead-ca/',
  '/lighting-installation-upgrades-san-gabriel-ca/': '/electrician-san-gabriel-ca/',
  '/lighting-installation-upgrades-san-marino-ca/': '/electrician-san-marino-ca/',
  '/lighting-installation-upgrades-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/lighting-installation-upgrades-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/lighting-installation-upgrades-temple-city-ca/': '/electrician-temple-city-ca/',
  '/new-construction-electrical-alhambra-ca/': '/electrician-alhambra-ca/',
  '/new-construction-electrical-baldwin-park-ca/': '/electrician-baldwin-park-ca/',
  '/new-construction-electrical-duarte-ca/': '/electrician-duarte-ca/',
  '/new-construction-electrical-el-monte-ca/': '/electrician-el-monte-ca/',
  '/new-construction-electrical-monrovia-ca/': '/electrician-monrovia-ca/',
  '/new-construction-electrical-montebello-ca/': '/electrician-montebello-ca/',
  '/new-construction-electrical-monterey-park-ca/': '/electrician-monterey-park-ca/',
  '/new-construction-electrical-rosemead-ca/': '/electrician-rosemead-ca/',
  '/new-construction-electrical-san-gabriel-ca/': '/electrician-san-gabriel-ca/',
  '/new-construction-electrical-san-marino-ca/': '/electrician-san-marino-ca/',
  '/new-construction-electrical-sierra-madre-ca/': '/electrician-sierra-madre-ca/',
  '/new-construction-electrical-south-pasadena-ca/': '/electrician-south-pasadena-ca/',
  '/new-construction-electrical-temple-city-ca/': '/electrician-temple-city-ca/',
}

export function isRetiredComboPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(RETIRED_COMBOS, path)
}

/**
 * Legacy URLs (all currently 404, or redirecting to a generic hub / via 2 hops).
 * Order matters only relative to redirects.ts catch-alls: these are emitted first.
 * Sources are written without a trailing slash; cleanupRedirects() adds it.
 */
export const LEGACY_REDIRECTS: readonly Redirect301[] = [
  // GSC 404 (new since Oct 7). /home, /home/, /home/home and www variants.
  { source: '/home', destination: '/' },
  // GSC 404 (new).
  { source: '/home/home', destination: '/' },
  // Wix page. 3 clicks, 592 impr.
  { source: '/about-us', destination: '/about/' },
  // Wix page.
  { source: '/our-clients', destination: '/about/' },
  // Wix page.
  { source: '/testimonials', destination: '/about/' },
  // Wix page.
  { source: '/areas-we-serve', destination: '/service-areas/' },
  // Wix page. Target is a Blog post (not protected): FYI Blog.
  { source: '/commercial', destination: '/commercial-electrical-services-los-angeles/' },
  // Wix page. 2 clicks, 538 impr. Target is a Blog post (not protected): FYI Blog.
  { source: '/industrial', destination: '/commercial-electrical-services-los-angeles/' },
  // Fix: today /our-company -> /our-company/ -> / (2 hops, DB redirect). Make one hop.
  { source: '/our-company', destination: '/about/' },
  // Fix: today 2 hops (DB redirect /residential + trailing slash). Make one hop.
  { source: '/residential', destination: '/services/' },
  // Old quote page, 83 impr.
  { source: '/get-a-quote', destination: '/contact/' },
  // Wix post.
  {
    source: '/single-post/where-to-locate-reliable-emergency-electrical-services-in-los-angeles',
    destination: '/emergency-electrician-los-angeles-ca/',
  },
  // Wix post.
  {
    source:
      '/single-post/essential-guide-to-ev-charger-installation-by-911-construction-electrics-inc',
    destination: '/ev-charger-installation-los-angeles-ca/',
  },
  // Wix post.
  {
    source:
      '/single-post/essential-guide-to-hiring-a-licensed-electrician-for-electrical-wire-repairs-in-greater-los-angeles',
    destination: '/electrical-repairs-los-angeles-ca/',
  },
  // Wix post. Target is a Blog post (not protected): FYI Blog.
  {
    source: '/single-post/rewiring-your-house-staying-up-to-code-and-safe',
    destination: '/whole-house-rewiring-cost-los-angeles/',
  },
  // Wix post. Target is a Blog post (not protected): FYI Blog.
  {
    source: '/single-post/why-you-should-always-hire-a-licensed-electrician-in-los-angeles',
    destination:
      '/how-to-choose-a-licensed-electrician-the-complete-guide-for-homeowners-and-businesses/',
  },
  // Wix post.
  {
    source:
      '/single-post/unveiling-the-expertise-of-los-angeles-electricians-at-911-construction-and-electric-inc',
    destination: '/about/',
  },
  // Wix post.
  {
    source:
      '/single-post/the-importance-of-trusting-local-electricians-in-the-los-angeles-area-with-911-construction-electr',
    destination: '/',
  },
  // Wix post. 1 click, 97 impr.
  {
    source:
      '/single-post/how-ai-advances-will-drive-demand-for-electricians-and-the-future-role-of-911-construction-electri',
    destination: '/blog/',
  },
  // Retarget (today 308 -> /services/). Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/residential/whole-house-rewiring-los-angeles-county',
    destination: '/whole-house-rewiring-cost-los-angeles/',
  },
  // Retarget (today -> /services/). 1 click, 883 impr.
  {
    source: '/services/electrical/residential/ev-charger-installation-los-angeles-county',
    destination: '/ev-charger-installation-los-angeles-ca/',
  },
  // Retarget (today -> /services/). 1,900 impr. Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/residential/recessed-lighting-los-angeles-county',
    destination: '/recessed-lighting-installation-los-angeles/',
  },
  // Retarget. 3 clicks, 2,167 impr. Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/commercial/lighting-retrofits-los-angeles-county',
    destination: '/commercial-lighting-installation-los-angeles/',
  },
  // Retarget. Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/commercial/solar-battery-los-angeles-county',
    destination: '/home-battery-backup-installation-los-angeles/',
  },
  // Retarget (new). 2 clicks, 2,058 impr. Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/commercial/generators-los-angeles-county',
    destination: '/commercial-generator-installation-los-angeles/',
  },
  // Retarget (new). 2 clicks, 931 impr.
  {
    source: '/services/electrical/commercial/panel-upgrade-los-angeles-county',
    destination: '/electrical-panel-upgrades-los-angeles-ca/',
  },
  // In GSC Page-with-redirect. Retarget.
  {
    source: '/services/electrical/commercial/electrical-panel-upgrade',
    destination: '/electrical-panel-upgrades-los-angeles-ca/',
  },
  // Retarget (new). Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/commercial/security-system-wiring-los-angeles-county',
    destination: '/commercial-electrical-services-los-angeles/',
  },
  // Retarget (new). 281 impr. Target is a Blog post: FYI Blog.
  {
    source: '/services/electrical/commercial/energy-management-los-angeles-county',
    destination: '/commercial-electrical-services-los-angeles/',
  },
  // Construction era.
  {
    source: '/services/construction/residential/custom-home-builder-los-angeles-county',
    destination: '/new-construction-electrical-los-angeles-ca/',
  },
  // Construction era.
  {
    source: '/services/construction/commercial/design-build-construction-los-angeles-county',
    destination: '/new-construction-electrical-los-angeles-ca/',
  },
  // Construction era.
  {
    source:
      '/services/construction/commercial/title-24-energy-efficient-construction-los-angeles-county',
    destination: '/new-construction-electrical-los-angeles-ca/',
  },
  // Construction era. 1 click, 3,481 impr. Target is a Blog post: FYI Blog.
  {
    source:
      '/services/construction/commercial/tenant-improvements-office-buildouts-in-los-angeles-county',
    destination: '/commercial-electrical-services-los-angeles/',
  },
  // Construction-era post, 2,351 impr (pos 58). Target is a Blog post: FYI Blog (or let 404).
  {
    source: '/blog/electrical-upgrades-los-angeles-home-remodel',
    destination: '/kitchen-remodel-electrical-los-angeles/',
  },
  // LA hub lives at /services/los-angeles-ca/.
  { source: '/electrician-los-angeles-ca', destination: '/services/los-angeles-ca/' },
  // Old area page (new in export). 909 impr.
  { source: '/areas/burbank', destination: '/electrician-burbank-ca/' },
  // Old area page (new). 275 impr.
  { source: '/areas/glendale', destination: '/electrician-glendale-ca/' },
  // Old area page (new). 420 impr.
  { source: '/areas/santa-monica', destination: '/electrician-santa-monica-ca/' },
  // Old post slug (new 404). 1 click, 31 impr. Target is a Blog post; Blog confirms target.
  {
    source: '/los-angeles-gfci-outlet-upgrades',
    destination: '/do-los-angeles-homes-need-gfci-outlet-upgrades/',
  },
  // Old post slug (new 404). 34 impr. Target is a Blog post; Blog confirms target.
  {
    source: '/whole-house-surge-protection-los-angeles',
    destination: '/whole-house-surge-protector-installation-los-angeles/',
  },
]

/**
 * Old post URLs whose destination is a Blog post. Each was confirmed by the Blog
 * owner on 2026-10-10. Any other post destination must be listed in
 * REVIEWED_POST_DESTINATIONS (they were in the plan Haik approved as 'FYI Blog').
 */
export const BLOG_CONFIRMED_POST_DESTINATIONS = [
  '/do-los-angeles-homes-need-gfci-outlet-upgrades/',
  '/whole-house-surge-protector-installation-los-angeles/',
] as const
/**
 * Post destinations reviewed in the approved plan (marked "FYI Blog", no objection).
 * Tests fail if any redirect lands on a post not listed here or above.
 */
export const REVIEWED_POST_DESTINATIONS = [
  '/commercial-electrical-services-los-angeles/',
  '/commercial-lighting-installation-los-angeles/',
  '/commercial-generator-installation-los-angeles/',
  '/home-battery-backup-installation-los-angeles/',
  '/how-to-choose-a-licensed-electrician-the-complete-guide-for-homeowners-and-businesses/',
  '/kitchen-remodel-electrical-los-angeles/',
  '/recessed-lighting-installation-los-angeles/',
  '/whole-house-rewiring-cost-los-angeles/',
] as const

/** Posts the Blog owner protected on 2026-10-10: never a redirect source or destination. */
export const PROTECTED_POST_PATHS = [
  '/electrician-highland-park-los-angeles/',
  '/electrician-eagle-rock-ca-panel-upgrades/',
  '/electrician-glendale-ca-panel-upgrades-ev-chargers/',
  '/electrician-arcadia-ca-panel-upgrades/',
  '/electrician-burbank-ca-panel-upgrades-ev-chargers/',
  '/electrician-pasadena-ca-panel-upgrades/',
  '/electrician-altadena-ca-panel-upgrades/',
  '/electrician-highland-park-ca-rewiring/',
  '/electrician-south-pasadena-ca-rewiring/',
  '/electrician-san-marino-ca-panel-upgrades/',
  '/electrician-sierra-madre-ca-rewiring/',
  '/electrician-alhambra-ca-panel-upgrades/',
  '/electrician-san-gabriel-ca-ev-chargers/',
  '/electrician-monrovia-ca-rewiring/',
  '/electrician-montebello-ca-electrical-repairs/',
  '/electrician-el-monte-ca-panel-upgrades/',
  '/electrician-rosemead-ca-electrical-repairs/',
  '/electrician-baldwin-park-ca-electrical-repairs/',
  '/panel-upgrade-rebates-pasadena-los-angeles/',
  '/pasadena-electrical-permits-panel-ev-charger-rewire/',
  '/pasadena-panel-upgrade-rebate-2026-requirements-documents-timeline/',
  '/electrician-temple-city-ca-panel-upgrades/',
  '/electrician-monterey-park-ca-ev-chargers/',
  '/electrician-duarte-ca-panel-upgrades/',
] as const

/** Non-post, non-city destinations that exist as fixed routes or service pages. */
export const KNOWN_PAGE_DESTINATIONS = [
  '/',
  '/about/',
  '/blog/',
  '/contact/',
  '/services/',
  '/service-areas/',
  '/services/los-angeles-ca/',
  '/electrical-panel-upgrades-los-angeles-ca/',
  '/electrical-repairs-los-angeles-ca/',
  '/emergency-electrician-los-angeles-ca/',
  '/ev-charger-installation-los-angeles-ca/',
  '/lighting-installation-upgrades-los-angeles-ca/',
  '/new-construction-electrical-los-angeles-ca/',
] as const

/**
 * Build the 301 list for next.config redirects. Sources are emitted in their
 * trailing-slash form: the site uses `trailingSlash: true`, and Next always runs
 * its own slash-append redirect (308) before custom redirects, so a bare legacy
 * URL like /our-company takes 308 -> /our-company/ then 301 -> /about/. A
 * vercel.json redirect does not run earlier (verified on the PR preview).
 */
export function cleanupRedirects(): { source: string; destination: string; statusCode: 301 }[] {
  const withSlash = (p: string) => (p.endsWith('/') ? p : `${p}/`)
  return [
    ...LEGACY_REDIRECTS.map((r) => ({ source: withSlash(r.source), destination: r.destination })),
    ...Object.entries(RETIRED_COMBOS).map(([source, destination]) => ({ source, destination })),
  ].map((r) => ({ ...r, statusCode: 301 as const }))
}
