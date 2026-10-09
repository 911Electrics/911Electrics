#!/usr/bin/env node
/**
 * Fill in `localNotes` for the service-area cities that have none.
 *
 * Why: a service × city page shares ~58% of its prose with the other 55
 * cities' pages for the same service (hero, `service.features`,
 * `service.benefits`, the service FAQs, CTA and contact block are all
 * identical). `localNotes` is the one field that is genuinely about the city —
 * real corridors and landmarks, the housing stock, the utility, and which
 * building department issues the permit. It was already written for the 13 SGV
 * expansion cities (scripts/seed-sgv-cities.mjs) and was empty on the other 42,
 * including every city currently earning organic keywords.
 *
 * This covers the 21 cities that rank for at least one keyword, ordered by
 * ranking-keyword count (Semrush, US database).
 *
 * How it writes: `PATCH /api/content/cities/{id}` with **only** `localNotes` in
 * the body. Every other field on that endpoint is optional and falls back to
 * the stored value, so the existing neighborhoods, FAQ overrides, zip codes and
 * meta are untouched. (Sending `neighborhoods` or `faqs` would DELETE and
 * replace those child rows — this script never sends them.) The API converts
 * the Markdown to Lexical with the same `markdownToLexical()` the Studio editor
 * uses, and fires the cache + sitemap revalidation.
 *
 * Usage:
 *   BLOG_API_TOKEN=xxx node scripts/seed-city-local-notes.mjs             # dry run, writes nothing
 *   BLOG_API_TOKEN=xxx node scripts/seed-city-local-notes.mjs --apply     # actually PATCH
 *   BLOG_API_TOKEN=xxx node scripts/seed-city-local-notes.mjs --apply --only pasadena,glendale
 *   SEED_BASE_URL=https://preview... BLOG_API_TOKEN=xxx node ... --apply
 *
 * Unlike seed-sgv-cities.mjs (which CREATEs and is a no-op on conflict), this
 * UPDATEs existing live rows, so the default is inverted: it reports what it
 * would do and needs an explicit `--apply`.
 *
 * Idempotency guard: `GET /api/content/cities/{id}` does not return
 * `localNotes`, so before writing, each city's public page is checked for
 * existing prose in its "Serving … and Nearby Neighborhoods" section. A city
 * that already has notes is skipped unless `--force` is passed, so a re-run
 * cannot quietly overwrite something an editor added in Studio.
 *
 * ── Accuracy notes, please read before applying ────────────────────────────
 *
 * Utility. Follows HANDOFF-BLOG-AUTOMATION.md §2. Note that table was corrected
 * at the same time as this script: it previously said "everywhere else → SCE"
 * and listed LA under SCE, which is wrong for City of Los Angeles
 * neighborhoods — they are on **LADWP**, and that covers 11 of the 21 cities
 * here (North Hollywood, Highland Park, Melrose, Encino, Tarzana, Reseda,
 * Chatsworth, Granada Hills, Northridge, North Hills, Sylmar). LADWP's own
 * service maps mark pockets inside the Valley as "Served by SCE", so the copy
 * below says "most of" rather than making an absolute claim on the boundary
 * neighborhoods. Pasadena → PWP, Glendale → GWP, Burbank → BWP. No rebate
 * dollar amounts are quoted anywhere.
 *
 * Permit authority. City of LA neighborhoods → LADBS. Altadena is
 * unincorporated, so → LA County Public Works Building & Safety. Everything
 * else names that city's own building division.
 *
 * Altadena deliberately says nothing about the January 2025 Eaton Fire or
 * rebuild work. It is very likely relevant to this business, but it is not
 * something to assert from a script without the owner deciding how to say it.
 */

const BASE = (process.env.SEED_BASE_URL || 'https://911electrics.com').replace(/\/$/, '')
const TOKEN = process.env.BLOG_API_TOKEN || process.env.CONTENT_API_TOKEN || ''
const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')
const ONLY = (() => {
  const i = process.argv.indexOf('--only')
  return i === -1 ? null : new Set((process.argv[i + 1] || '').split(',').filter(Boolean))
})()

const PANEL = 'https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/'
const EV = 'https://911electrics.com/ev-charger-installation-los-angeles-ca/'
const REPAIRS = 'https://911electrics.com/electrical-repairs-los-angeles-ca/'
const LIGHTING = 'https://911electrics.com/lighting-installation-upgrades-los-angeles-ca/'
const NEWCON = 'https://911electrics.com/new-construction-electrical-los-angeles-ca/'
const EMERGENCY = 'https://911electrics.com/emergency-electrician-los-angeles-ca/'

/** slug token → localNotes Markdown. Ordered by ranking-keyword count. */
const NOTES = {
  pasadena: `We cover all of Pasadena — Old Pasadena and the Playhouse District, the South Lake shopping corridor, Bungalow Heaven, Madison Heights, and the streets around Caltech and the Rose Bowl. Pasadena's Craftsman and bungalow stock is largely pre-1930, so undersized services and original wiring are the two issues we meet most, and a [panel upgrade](${PANEL}) is usually the first step before an [EV charger](${EV}) or central air. Pasadena runs on its own municipal utility, Pasadena Water & Power — not SCE — which has its own panel-upgrade and EV-charger rebates; confirm current terms with PWP. Permits go through the City of Pasadena Permit Center.`,

  'thousand-oaks': `We serve Thousand Oaks across the Conejo Valley — Newbury Park, the Moorpark Road and Janss Road corridors, Lynn Ranch, Wildwood, and the neighborhoods bordering Westlake Village. Most of the housing here went up between the 1960s and the 1980s, so the work skews differently from older LA County cities: 100- and 125-amp services that are fine for the original house but not for a [Level 2 EV charger](${EV}), a remodel, or added HVAC. Southern California Edison is the utility. Electrical permits are issued by the City of Thousand Oaks Building Division.`,

  'north-hollywood': `We work throughout North Hollywood — the NoHo Arts District, the Lankershim and Magnolia Boulevard corridors, Valley Village, and the blocks bordering Toluca Lake and Studio City. The housing is mostly post-war, 1940s and '50s, with a heavy layer of duplex and small-apartment conversions, which means overloaded circuits, ungrounded two-prong outlets and undersized panels are the everyday [electrical repairs](${REPAIRS}) here. Most of North Hollywood is served by LADWP rather than SCE. Because this is the City of Los Angeles, permits and inspections go through LADBS, which we handle as your licensed C-10 contractor.`,

  'highland-park': `We cover Highland Park and the rest of Northeast LA — the York Boulevard and Figueroa Street corridors, Garvanza, and the hillside streets toward Mount Washington. Highland Park's housing is among the oldest in the city, mostly 1900s–1920s Craftsman, and a large share still has original knob-and-tube or cloth-insulated wiring behind the walls. [Rewiring and electrical repair](${REPAIRS}) on renovation projects is the bulk of our work here, usually alongside a [service upgrade](${PANEL}). Most of the area is on LADWP. Permits are pulled through LADBS.`,

  altadena: `We serve Altadena from the Lake Avenue corridor and Mariposa Street up through Christmas Tree Lane and the foothill streets below the Angeles National Forest. Altadena is unincorporated Los Angeles County rather than its own city, so electrical permits are issued by LA County Public Works Building & Safety, not a city building department — we pull them and coordinate inspection for you. The utility here is Southern California Edison. Older foothill houses on aging services are the common case, so [panel upgrades and electrical repairs](${PANEL}) make up most of what we do in Altadena.`,

  glendale: `We work across Glendale — Downtown and the Brand Boulevard corridor, Adams Hill, Chevy Chase Canyon, Verdugo Woodlands, and the foothill blocks toward Montrose and La Crescenta. The mix of 1920s houses in the older flats and hillside homes built decades later means we see both original-era wiring and services that simply ran out of capacity, so a [panel upgrade](${PANEL}) is the usual starting point. Glendale is served by its own municipal utility, Glendale Water & Power, not SCE, and GWP runs its own rebate programs — check GWP's current terms rather than assuming SCE's apply. Permits go through the City of Glendale Building & Safety Division.`,

  'beverly-hills': `We serve Beverly Hills throughout the Flats, Trousdale Estates, the hillside streets above Sunset, and the Wilshire and Santa Monica Boulevard business corridors. Many of the larger older homes here still run services that were generous in their day and are now the limiting factor, and the request is almost always the same combination: a [200-amp service upgrade](${PANEL}) sized for the whole property, then [EV charging](${EV}), pool equipment, or [lighting](${LIGHTING}). Southern California Edison is the utility. Permits and plan check go through the City of Beverly Hills Building & Safety Division.`,

  burbank: `We cover Burbank from Magnolia Park and Downtown through the Media District and the equestrian Rancho neighborhood, plus the hillside streets above Glenoaks. Burbank's post-war housing stock is dense with original panels that predate modern grounding, and the Rancho's detached garages and barns often need [dedicated circuits and repairs](${REPAIRS}) of their own. Burbank has its own municipal utility, Burbank Water & Power — not SCE — so check BWP's current rebate programs for panel and [EV charger](${EV}) work. Permits are issued by the City of Burbank Building Division.`,

  calabasas: `We serve Calabasas along the Las Virgenes Road and Mulholland corridors, Old Town Calabasas, Calabasas Hills, Mountain View Estates and the gated communities off Parkway Calabasas. The homes here are newer and larger than most of our service area, which changes the work: it is less about obsolete panels and more about capacity planning for [EV chargers](${EV}) — often two — plus pool and spa equipment, backup power and whole-house [lighting](${LIGHTING}). Southern California Edison is the utility. Permits go through the City of Calabasas Building & Safety Division.`,

  'north-hills': `We cover North Hills across the Sepulveda Boulevard and Nordhoff Street corridors, the Woodman and Devonshire neighborhoods, and the blocks bordering Panorama City and Mission Hills. This is mid-century San Fernando Valley tract housing, so the pattern is consistent: original 100-amp services, limited kitchen and laundry circuits, and no grounding — all of which surface the moment a homeowner adds air conditioning or a [Level 2 EV charger](${EV}). Most of the area is served by LADWP. Permits and inspections run through LADBS.`,

  'santa-monica': `We serve Santa Monica through Ocean Park, Sunset Park, Wilshire-Montana, the Pico district and the Main Street and Montana Avenue corridors. Two things shape the work here: a lot of older multifamily and duplex stock with shared, undersized services, and the coastal air, which is hard on outdoor panels, meter sockets and exterior fixtures — corrosion is a real failure mode within sight of the ocean and a common reason for [electrical repairs](${REPAIRS}) here. Southern California Edison is the utility. Santa Monica reviews electrical work closely; permits go through the City of Santa Monica Building & Safety Division and we handle inspection.`,

  chatsworth: `We work throughout Chatsworth — the Devonshire Street and Topanga Canyon Boulevard corridors, the neighborhoods around Stoney Point and Chatsworth Reservoir, and the equestrian properties in the northwest Valley. Ranch homes and horse properties here often have long feeder runs to detached garages, barns, tack rooms and well pumps, so [dedicated circuits and outdoor repairs](${REPAIRS}) are a bigger share of our Chatsworth work than elsewhere. Most of the area is on LADWP. As part of the City of Los Angeles, permits go through LADBS.`,

  encino: `We cover Encino along the Ventura Boulevard corridor, up into Encino Hills, and across Amestoy Estates and the Balboa and White Oak neighborhoods. The large 1950s and '60s ranch homes south of the boulevard are the typical job: a generous footprint on an original service that now has to carry a pool, a remodeled kitchen, and often two [EV chargers](${EV}), which usually means a [200-amp upgrade](${PANEL}) first. Most of Encino is served by LADWP. Permits are pulled through LADBS.`,

  'granada-hills': `We serve Granada Hills across the Chatsworth Street and White Oak Avenue corridors, Knollwood, and the hillside streets north toward the Santa Susana foothills. Most of the housing is post-war and early-1960s tract construction on original services, so panel capacity is the recurring theme — particularly on the hillside blocks, where detached garages and long exterior runs add their own [repair](${REPAIRS}) work. Most of the area is on LADWP. Permits and inspections are handled through LADBS.`,

  northridge: `We work across Northridge — the Reseda Boulevard and Devonshire Street corridors, the neighborhoods around CSUN, and the streets bordering Porter Ranch. Northridge homes carry a specific history: many were repaired or retrofitted after the 1994 earthquake, and we still find junction boxes, added circuits and subpanels from that era that were never brought fully up to current code. Sorting that out is a real part of our [electrical repair](${REPAIRS}) work here. Most of Northridge is served by LADWP, and permits run through LADBS.`,

  oxnard: `We serve Oxnard from the Channel Islands Harbor and Oxnard Shores through Downtown, the Rose Avenue commercial corridor and the surrounding agricultural properties. The coastal exposure here is the defining factor — salt air corrodes meter sockets, outdoor panels and exterior fixtures far faster than it does inland, and it is the most common reason an Oxnard panel needs replacing before its time. We also handle [commercial and new-construction electrical](${NEWCON}) for the area's agricultural and industrial buildings. Southern California Edison is the utility; permits go through the City of Oxnard Building Division.`,

  tarzana: `We cover Tarzana along the Ventura Boulevard corridor, the Reseda Boulevard business district, and the hillside streets south of the boulevard toward Mulholland. The hillside homes are where most of our Tarzana work sits: older properties on original services, often with detached structures, pools and long exterior feeder runs that need [repair or replacement](${REPAIRS}) before any new load is added. Most of Tarzana is served by LADWP. Permits and inspections go through LADBS.`,

  arcadia: `We serve Arcadia around Santa Anita Park, the Baldwin Avenue and Huntington Drive corridors, Upper Rancho and the neighborhoods near the Arboretum. Arcadia is unusual in our service area for how much of it is being rebuilt — large new construction replacing mid-century houses — so we work both sides of it: [new-construction electrical](${NEWCON}) on the rebuilds, and [panel upgrades](${PANEL}) on the original homes that remain. Southern California Edison is the utility. Permits and plan check go through the City of Arcadia Building Services Division.`,

  melrose: `We cover the Melrose district through the Melrose Avenue retail corridor, the blocks toward Fairfax and Beverly, and the residential streets bordering Hancock Park and Larchmont. It is a dense mix of 1920s duplexes and small apartment buildings alongside ground-floor retail, so the work splits between old residential wiring — ungrounded outlets, original panels — and [lighting and tenant-improvement](${LIGHTING}) work for shops along Melrose. Most of the area is served by LADWP, and permits go through LADBS.`,

  reseda: `We work throughout Reseda along the Sherman Way, Victory Boulevard and Reseda Boulevard corridors, and the residential blocks toward Winnetka and Lake Balboa. Reseda is post-war tract housing almost throughout, and it has seen a lot of ADU and garage-conversion activity — which nearly always needs a [service upgrade](${PANEL}) and a properly permitted subpanel, not just a new circuit. Most of Reseda is served by LADWP. Permits for the main house and any ADU go through LADBS.`,

  sylmar: `We serve Sylmar across the Foothill Boulevard, Roxford Street and Glenoaks Boulevard corridors and the horse properties on the slopes below the San Gabriels. Sylmar has more large lots and detached outbuildings than most of the Valley, so long feeder runs to barns, shops and well pumps are routine, as is rooftop solar wanting a [panel upgrade](${PANEL}) to interconnect cleanly. We also cover the foothill blocks for [24/7 emergency service](${EMERGENCY}) during wind-driven outages. Most of the area is on LADWP, with permits through LADBS.`,
}

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!TOKEN) fail('Set BLOG_API_TOKEN (the content API bearer token).')

/** Does this city already have localNotes prose on its public page? */
async function hasExistingNotes(slug) {
  try {
    const res = await fetch(`${BASE}/${slug}/`, { headers: { 'User-Agent': 'seed-local-notes' } })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/Serving .{0,80}?Nearby Neighborhoods(.*?)<\/section>/s)
    if (!m) return false
    const prose = m[1]
      .replace(/<ul[\s\S]*?<\/ul>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return prose.split(' ').filter(Boolean).length >= 15
  } catch {
    return null
  }
}

async function main() {
  const listRes = await fetch(`${BASE}/api/content/cities`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!listRes.ok) fail(`GET /api/content/cities → ${listRes.status} ${await listRes.text()}`)
  const { cities } = await listRes.json()
  const bySlug = new Map(cities.map((c) => [c.slug, c]))

  const targets = Object.keys(NOTES).filter((t) => !ONLY || ONLY.has(t))
  if (ONLY) {
    const unknown = [...ONLY].filter((t) => !(t in NOTES))
    if (unknown.length) fail(`--only names cities this script has no copy for: ${unknown.join(', ')}`)
  }

  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} · ${BASE} · ${targets.length} cities\n`,
  )

  let written = 0
  let skipped = 0
  for (const token of targets) {
    const slug = `electrician-${token}-ca`
    const city = bySlug.get(slug)
    if (!city) {
      console.log(`  ⚠ ${token.padEnd(18)} no city row with slug ${slug} — skipped`)
      skipped++
      continue
    }

    const existing = await hasExistingNotes(slug)
    if (existing === null) {
      console.log(`  ⚠ ${token.padEnd(18)} could not read ${BASE}/${slug}/ — skipped`)
      skipped++
      continue
    }
    if (existing && !FORCE) {
      console.log(`  – ${token.padEnd(18)} already has local notes — skipped (--force to replace)`)
      skipped++
      continue
    }

    const words = NOTES[token].split(/\s+/).length
    if (!APPLY) {
      console.log(`  → ${token.padEnd(18)} id=${String(city.id).padEnd(4)} would write ${words} words`)
      continue
    }

    const res = await fetch(`${BASE}/api/content/cities/${city.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      // ONLY localNotes — see the header note about child-row replacement.
      body: JSON.stringify({ localNotes: NOTES[token] }),
    })
    if (!res.ok) {
      console.log(`  ✗ ${token.padEnd(18)} PATCH → ${res.status} ${await res.text()}`)
      skipped++
      continue
    }
    console.log(`  ✓ ${token.padEnd(18)} id=${String(city.id).padEnd(4)} ${words} words written`)
    written++
  }

  console.log(`\n${APPLY ? `written: ${written}` : 'nothing written (dry run)'} · skipped: ${skipped}`)
  if (APPLY && written) {
    console.log(
      'The API revalidated the city pages, the service×city pages and the sitemap automatically.',
    )
  }
}

main().catch((err) => fail(err?.message || String(err)))
