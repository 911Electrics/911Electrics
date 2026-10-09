// Browser port of scripts/seo-crawl.mjs `crawl`, for when the crawl can't run
// from a sandbox. Run it in a tab on the origin being crawled (same-origin
// fetches only; GET only). It downloads <name>.tsv in the same column format,
// so `node scripts/seo-crawl.mjs diff` works on the output unchanged.
//
//   On https://911electrics.com:            await seoCrawl('crawl-live')
//   On the protected *.vercel.app deploy:   await seoCrawl('crawl-new', '<bypass secret>')
//
// Differences from the Node crawler (identical for both runs, so the diff is
// still like-for-like): browsers hide redirect responses, so a redirect is
// recorded as status "3xx" with `location` = the FINAL path after following
// every hop (no 301/308 distinction, no chain length). The inventory is this
// origin's own sitemap plus the fixed list below (legacy redirect sources,
// frozen WordPress URLs, Semrush ranking pages); a live path missing from the
// new sitemap shows up in the diff as MISSING instead of as a 404.
async function seoCrawl(name, bypass) {
  const EXTRA = ["/","/100-amp-vs-200-amp-panel-upgrade-los-angeles/","/7-warning-signs-your-los-angeles-home-needs-rewiring/","/about/","/arc-fault-breaker-keeps-tripping-los-angeles/","/author/admin/","/blog/","/category-sitemap.xml","/category/electrical-tips/","/category/uncategorized/","/comments/feed/","/commercial-ev-charging-station-installation-los-angeles/","/complete-guide-ev-charger-installation-los-angeles/","/contact/","/do-los-angeles-homes-need-gfci-outlet-upgrades/","/electric-meter-box-replacement-los-angeles/","/electrical-panel-upgrade-cost-los-angeles/","/electrical-panel-upgrades-los-angeles-ca/","/electrical-panel-upgrades-sunland-ca/","/electrical-panel-upgrades-woodland-hills-ca/","/electrical-repairs-los-angeles-ca/","/electrician-altadena-ca/","/electrician-arcadia-ca/","/electrician-arleta-ca/","/electrician-beverly-hills-ca/","/electrician-burbank-ca/","/electrician-calabasas-ca/","/electrician-canoga-park-ca/","/electrician-chatsworth-ca/","/electrician-cost-los-angeles/","/electrician-eagle-rock-ca/","/electrician-encino-ca/","/electrician-glendale-ca/","/electrician-granada-hills-ca/","/electrician-hancock-park-ca/","/electrician-highland-park-ca/","/electrician-highland-park-los-angeles/","/electrician-hollywood-ca/","/electrician-la-canada-ca/","/electrician-la-crescenta-ca/","/electrician-long-beach-ca/","/electrician-los-feliz-ca/","/electrician-melrose-ca/","/electrician-mission-hills-ca/","/electrician-montrose-ca/","/electrician-north-hills-ca/","/electrician-north-hollywood-ca/","/electrician-northridge-ca/","/electrician-oxnard-ca/","/electrician-pasadena-ca/","/electrician-porter-ranch-ca/","/electrician-reseda-ca/","/electrician-san-fernando-ca/","/electrician-san-fernando-valley-ca/","/electrician-santa-monica-ca/","/electrician-sherman-oaks-ca/","/electrician-studio-city-ca/","/electrician-sun-valley-ca/","/electrician-sunland-ca/","/electrician-sylmar-ca/","/electrician-tarzana-ca/","/electrician-thousand-oaks-ca/","/electrician-toluca-lake-ca/","/electrician-tujunga-ca/","/electrician-van-nuys-ca/","/electrician-west-hills-ca/","/electrician-woodland-hills-ca/","/emergency-electrician-los-angeles-ca/","/emergency-electrician-pasadena-ca/","/ev-charger-installation-los-angeles-ca/","/ev-charger-installation-permit-los-angeles/","/ev-charger-installation-woodland-hills-ca/","/evitp-certification-ev-charger-incentives-los-angeles","/evitp-electrician-los-angeles/","/feed/","/geo-sitemap.xml","/how-to-choose-a-licensed-electrician-the-complete-guide-for-homeowners-and-businesses/","/lighting-installation-upgrades-los-angeles-ca/","/llms.txt","/locations.kml","/los-angeles-home-ev-charger-installation/","/new-construction-electrical-los-angeles-ca/","/our-company","/outdated-home-wiring-loose-connections-electrical-safety/","/page-sitemap.xml","/panel-upgrade-for-ev-charger-installation-los-angeles/","/panel-upgrade-rebates-pasadena-los-angeles/","/partial-power-outage-in-house-los-angeles/","/pasadena-ev-charger-rebate-homeowners/","/post-sitemap.xml","/pre-purchase-electrical-inspection-los-angeles/","/residential","/robots.txt","/sce-4200-rebate-panel-upgrade-ev-charger-installation-los-angeles/","/service-areas/","/services/","/services/electrical/","/services/electrical/residential/","/services/los-angeles-ca/","/signs-you-need-an-electrical-panel-upgrade-in-los-angeles/","/sitemap.xml","/sitemap_index.xml","/subpanel-installation-los-angeles/","/temporary-power-pole-installation-los-angeles/","/top-5-benefits-panel-upgrade-ev-charger-los-angeles/","/why-evitp-certification-matters-for-ev-charger-incentives-los-angeles/","/why-hiring-an-evitp-certified-installer-matters-in-los-angeles/","/wp-admin/"]
  const COLUMNS = ['path', 'status', 'location', 'x_robots', 'meta_robots', 'canonical', 'title', 'h1', 'jsonld']
  const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {}
  const pathOf = (u) => { try { const x = new URL(u, location.origin); return x.pathname + x.search } catch { return null } }
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  const clean = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  const attr = (tag, n) => { const m = tag.match(new RegExp(`${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? decode(m[2] ?? m[3] ?? '') : '' }
  function parseHtml(html) {
    const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
    let canonical = '', metaRobots = ''
    for (const t of html.match(/<link\b[^>]*>/gi) ?? []) if (/rel\s*=\s*["']?canonical/i.test(t)) canonical = attr(t, 'href')
    for (const t of html.match(/<meta\b[^>]*>/gi) ?? []) if (/name\s*=\s*["']?robots/i.test(t)) metaRobots = attr(t, 'content')
    const types = new Set()
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      const visit = (n) => { if (Array.isArray(n)) return n.forEach(visit); if (n && typeof n === 'object') { if (n['@type']) [].concat(n['@type']).forEach((t) => types.add(t)); if (n['@graph']) visit(n['@graph']) } }
      try { visit(JSON.parse(m[1])) } catch { types.add('INVALID_JSON') }
    }
    return { title, h1, canonical, metaRobots, jsonld: [...types].sort().join(',') }
  }
  const get = (p, redirect) => fetch(p, { redirect, headers, cache: 'no-store', credentials: 'same-origin' })

  const sm = await get('/sitemap.xml', 'manual')
  if (sm.status !== 200) throw new Error(`sitemap.xml answered ${sm.status || sm.type}`)
  const locs = [...(await sm.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
  const paths = new Set(EXTRA)
  for (const m of locs) paths.add(pathOf(m[1]))
  paths.delete(null)
  const list = [...paths].sort()
  console.log(`inventory: ${list.length} paths (${locs.length} from sitemap)`)

  const rows = []
  let next = 0
  async function worker() {
    while (next < list.length) {
      const path = list[next++]
      const row = { path }
      try {
        const res = await get(path, 'manual')
        if (res.type === 'opaqueredirect') {
          row.status = '3xx'
          try { const f = await get(path, 'follow'); row.location = pathOf(f.url) + (/^https?:\/\/www\./.test(f.url) ? ' [www]' : ''); await f.arrayBuffer() } catch { row.location = 'CROSS-ORIGIN' }
        } else {
          row.status = String(res.status)
          row.x_robots = res.headers.get('x-robots-tag') ?? ''
          if (res.status === 200 && (res.headers.get('content-type') ?? '').includes('text/html')) {
            const p = parseHtml(await res.text())
            Object.assign(row, { meta_robots: p.metaRobots, canonical: p.canonical, title: p.title, h1: p.h1, jsonld: p.jsonld })
          } else await res.arrayBuffer().catch(() => {})
        }
      } catch (err) { row.status = `ERR ${err.name}` }
      rows.push(row)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  rows.sort((a, b) => a.path.localeCompare(b.path))
  const tsv = [COLUMNS.join('\t'), ...rows.map((r) => COLUMNS.map((c) => (r[c] ?? '').replace(/[\t\n]/g, ' ')).join('\t'))].join('\n') + '\n'
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([tsv], { type: 'text/tab-separated-values' })), download: `${name}.tsv` })
  document.body.appendChild(a); a.click(); a.remove()
  const counts = rows.reduce((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {})
  const home = rows.find((r) => r.path === '/') ?? {}
  const summary = { origin: location.origin, at: new Date().toISOString(), rows: rows.length, sitemapUrls: locs.length, counts, home: { status: home.status, x_robots: home.x_robots, meta_robots: home.meta_robots, canonical: home.canonical } }
  console.log(JSON.stringify(summary, null, 2))
  return summary
}
