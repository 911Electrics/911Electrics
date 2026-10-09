#!/usr/bin/env node
/**
 * Backfill internal links on posts that were published before the city
 * auto-linker existed.
 *
 * Posts created through /api/blog/publish get their internal links at publish
 * time. Everything already in the archive predates the city pass
 * (src/lib/auto-link-cities.ts), so a post like "Highland Park Electrician in
 * Los Angeles: Panel Upgrades" — the site's single strongest organic page —
 * still does not link to /electrician-highland-park-ca/.
 *
 * This walks the archive and asks the API to re-run the linking pass over each
 * stored body (`PATCH /api/blog/posts/{id}` with `{"relink": true}`). The body
 * text is never replaced; links are only added where a page is not linked yet,
 * and a post with nothing to add is not modified at all, so a second run is a
 * no-op.
 *
 * DRY-RUN BY DEFAULT — it writes nothing unless you pass --apply. The dry run
 * uses the API's own `dryRun` flag, so the counts it prints are exactly what
 * --apply would add.
 *
 *   BLOG_API_TOKEN=… node scripts/backfill-post-links.mjs            # preview
 *   BLOG_API_TOKEN=… node scripts/backfill-post-links.mjs --apply    # write
 *   … --only 12,40            # just these post ids
 *   … --include-drafts        # drafts are skipped by default
 *
 * Applying bumps `updated_at` on each changed post (it is a real edit: the
 * article shows "Updated" and `dateModified` changes) and adds a revision, so
 * it can be undone per post from Studio → Posts → Revisions.
 *
 * Requires the deploy that added `relink` to be live on SEED_BASE_URL.
 */

const BASE = (process.env.SEED_BASE_URL || 'https://911electrics.com').replace(/\/$/, '')
const TOKEN = process.env.BLOG_API_TOKEN || process.env.CONTENT_API_TOKEN || ''
const APPLY = process.argv.includes('--apply')
const INCLUDE_DRAFTS = process.argv.includes('--include-drafts')
const ONLY = (() => {
  const i = process.argv.indexOf('--only')
  return i === -1 ? null : new Set((process.argv[i + 1] || '').split(',').filter(Boolean))
})()
const PAGE = 200

if (!TOKEN) {
  console.error('Set BLOG_API_TOKEN (or CONTENT_API_TOKEN).')
  process.exit(1)
}

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

async function listPosts() {
  const all = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${BASE}/api/blog/publish?limit=${PAGE}&offset=${offset}`, { headers })
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`)
    const { posts } = await res.json()
    all.push(...posts)
    // A server without pagination support ignores `offset` and returns the same
    // first page forever — stop rather than loop.
    if (posts.length < PAGE || (offset > 0 && posts[0]?.id === all[0]?.id)) break
  }
  return all
}

async function relink(id, dryRun) {
  const res = await fetch(`${BASE}/api/blog/posts/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(dryRun ? { relink: true, dryRun: true } : { relink: true }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`)
  // A server that predates `relink` strips the unknown key and answers
  // "No fields to update" (422), which the !res.ok branch reports. One that
  // accepts it always returns `linksAdded`.
  if (typeof body.linksAdded !== 'number') {
    throw new Error('API did not report linksAdded — is the relink deploy live?')
  }
  return body.linksAdded
}

const posts = (await listPosts())
  .filter((p) => INCLUDE_DRAFTS || p.status === 'published')
  .filter((p) => !ONLY || ONLY.has(String(p.id)))

console.log(`${APPLY ? 'APPLYING to' : 'Dry run against'} ${BASE} — ${posts.length} posts\n`)

let changed = 0
let added = 0
let failed = 0
for (const post of posts) {
  try {
    const n = await relink(post.id, !APPLY)
    if (n > 0) {
      changed++
      added += n
      console.log(`  +${n}  #${post.id}  /${post.slug}/`)
    }
  } catch (err) {
    failed++
    console.error(`  !!  #${post.id}  /${post.slug}/  ${err.message}`)
  }
}

console.log(
  `\n${APPLY ? 'Added' : 'Would add'} ${added} links across ${changed} of ${posts.length} posts` +
    (failed ? ` — ${failed} failed` : '') +
    (APPLY ? '.' : '. Re-run with --apply to write.'),
)
process.exit(failed ? 1 : 0)
