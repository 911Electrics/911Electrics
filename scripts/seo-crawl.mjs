#!/usr/bin/env node
/**
 * SEO snapshot + diff, for the hosting migration (and any later regression hunt).
 *
 *   node scripts/seo-crawl.mjs crawl <origin> <out.tsv> [--paths-from <before.tsv>]
 *   node scripts/seo-crawl.mjs diff <before.tsv> <after.tsv> [--ignore-robots]
 *
 * `crawl` fetches every URL the site is known by (the target's own sitemap, the
 * frozen WordPress URL list, every page Semrush sees ranking, and the legacy
 * redirect sources) WITHOUT following redirects, and records per path: status,
 * redirect target, X-Robots-Tag, meta robots, canonical, <title>, first <h1>
 * and JSON-LD @types. Absolute URLs are re-pointed at <origin>, so the same
 * inventory can be crawled on the live domain and on a *.vercel.app deploy.
 *
 * Set VERCEL_BYPASS to a Protection Bypass for Automation secret to crawl a
 * deployment behind Vercel Authentication.
 *
 * `diff` compares two snapshots by path and exits 1 on any difference.
 * --ignore-robots skips X-Robots-Tag / meta robots, which are expected to read
 * noindex on a non-canonical host.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const COLUMNS = [
  'path',
  'status',
  'location',
  'x_robots',
  'meta_robots',
  'canonical',
  'title',
  'h1',
  'jsonld',
]

// Retired URL shapes that redirects.ts / url_redirects must keep answering.
const LEGACY_SOURCES = [
  '/sitemap_index.xml',
  '/page-sitemap.xml',
  '/post-sitemap.xml',
  '/category-sitemap.xml',
  '/geo-sitemap.xml',
  '/services/electrical/',
  '/services/electrical/residential/',
  '/locations.kml',
  '/category/uncategorized/',
  '/feed/',
  '/comments/feed/',
  '/author/admin/',
  '/wp-admin/',
  '/evitp-certification-ev-charger-incentives-los-angeles',
  '/residential',
  '/our-company',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
]

function pathOf(u) {
  try {
    const url = new URL(u, 'https://911electrics.com')
    return url.pathname + url.search
  } catch {
    return null
  }
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function clean(s) {
  return decode(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? decode(m[2] ?? m[3] ?? '') : ''
}

function parseHtml(html) {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
  let canonical = ''
  let metaRobots = ''
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/rel\s*=\s*["']?canonical/i.test(tag)) canonical = attr(tag, 'href')
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/name\s*=\s*["']?robots/i.test(tag)) metaRobots = attr(tag, 'content')
  }
  const types = new Set()
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const visit = (node) => {
      if (Array.isArray(node)) return node.forEach(visit)
      if (node && typeof node === 'object') {
        if (node['@type']) [].concat(node['@type']).forEach((t) => types.add(t))
        if (node['@graph']) visit(node['@graph'])
      }
    }
    try {
      visit(JSON.parse(m[1]))
    } catch {
      types.add('INVALID_JSON')
    }
  }
  return { title, h1, canonical, metaRobots, jsonld: [...types].sort().join(',') }
}

async function get(url) {
  const headers = { 'user-agent': '911electrics-seo-crawl/1.0' }
  if (process.env.VERCEL_BYPASS) headers['x-vercel-protection-bypass'] = process.env.VERCEL_BYPASS
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { redirect: 'manual', headers, signal: AbortSignal.timeout(30000) })
    } catch (err) {
      if (attempt >= 2) throw err
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

async function inventory(origin, pathsFrom) {
  const paths = new Set(LEGACY_SOURCES)
  // Re-crawl every path of an earlier snapshot too, so a page the new build
  // dropped from its sitemap still shows up (as a 404) instead of vanishing.
  if (pathsFrom) for (const path of load(pathsFrom).keys()) paths.add(path)
  const res = await get(`${origin}/sitemap.xml`)
  if (res.status !== 200) throw new Error(`sitemap.xml answered ${res.status} on ${origin}`)
  const locs = [...(await res.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
  for (const m of locs) paths.add(pathOf(m[1]))
  const sitemapCount = locs.length
  for (const u of JSON.parse(readFileSync('wp-snapshot/urls.json', 'utf8'))) paths.add(pathOf(u))
  if (existsSync('migration-baseline/pages-us.csv')) {
    for (const line of readFileSync('migration-baseline/pages-us.csv', 'utf8')
      .split('\n')
      .slice(1)) {
      if (line.trim()) paths.add(pathOf(line.split(',')[0]))
    }
  }
  paths.delete(null)
  console.error(`inventory: ${paths.size} paths (${sitemapCount} from sitemap)`)
  return [...paths].sort()
}

async function crawl(origin, out, pathsFrom) {
  origin = origin.replace(/\/$/, '')
  const paths = await inventory(origin, pathsFrom)
  const rows = []
  let next = 0
  async function worker() {
    while (next < paths.length) {
      const path = paths[next++]
      const row = { path }
      try {
        const res = await get(origin + path)
        row.status = String(res.status)
        const loc = res.headers.get('location') ?? ''
        row.location = loc ? pathOf(loc) + (/^https?:\/\/www\./.test(loc) ? ' [www]' : '') : ''
        row.x_robots = res.headers.get('x-robots-tag') ?? ''
        if (res.status === 200 && (res.headers.get('content-type') ?? '').includes('text/html')) {
          const p = parseHtml(await res.text())
          Object.assign(row, {
            meta_robots: p.metaRobots,
            canonical: p.canonical,
            title: p.title,
            h1: p.h1,
            jsonld: p.jsonld,
          })
        } else {
          await res.arrayBuffer().catch(() => {})
        }
      } catch (err) {
        row.status = `ERR ${err.cause?.code ?? err.name}`
      }
      rows.push(row)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  rows.sort((a, b) => a.path.localeCompare(b.path))
  const tsv = [
    COLUMNS.join('\t'),
    ...rows.map((r) => COLUMNS.map((c) => (r[c] ?? '').replace(/[\t\n]/g, ' ')).join('\t')),
  ]
  writeFileSync(out, tsv.join('\n') + '\n')
  const by = rows.reduce((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {})
  console.error(`wrote ${rows.length} rows to ${out}; status counts: ${JSON.stringify(by)}`)
}

function load(file) {
  const [head, ...lines] = readFileSync(file, 'utf8').trimEnd().split('\n')
  const cols = head.split('\t')
  return new Map(
    lines.map((l) => {
      const v = l.split('\t')
      return [v[0], Object.fromEntries(cols.map((c, i) => [c, v[i] ?? '']))]
    }),
  )
}

function diff(beforeFile, afterFile, ignoreRobots) {
  const before = load(beforeFile)
  const after = load(afterFile)
  const skip = new Set(['path', ...(ignoreRobots ? ['x_robots', 'meta_robots'] : [])])
  let problems = 0
  for (const [path, b] of before) {
    const a = after.get(path)
    if (!a) {
      console.log(`MISSING  ${path}`)
      problems++
      continue
    }
    for (const c of COLUMNS) {
      if (skip.has(c) || b[c] === a[c]) continue
      console.log(`CHANGED  ${path}  ${c}: ${JSON.stringify(b[c])} -> ${JSON.stringify(a[c])}`)
      problems++
    }
  }
  for (const path of after.keys()) {
    if (!before.has(path)) console.log(`NEW      ${path}  (only in ${afterFile})`)
  }
  console.log(`\n${before.size} paths compared, ${problems} difference(s)`)
  process.exit(problems ? 1 : 0)
}

const [cmd, a, b, flag, extra] = process.argv.slice(2)
if (cmd === 'crawl' && a && b) await crawl(a, b, flag === '--paths-from' ? extra : undefined)
else if (cmd === 'diff' && a && b) diff(a, b, flag === '--ignore-robots')
else {
  console.error(
    'usage: seo-crawl.mjs crawl <origin> <out.tsv> [--paths-from <before.tsv>] | diff <before.tsv> <after.tsv> [--ignore-robots]',
  )
  process.exit(2)
}
