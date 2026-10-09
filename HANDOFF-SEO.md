# Handoff — SEO migration audit & 301 map (911 Electrics)

## Goal
Finish the **WordPress → Next.js SEO migration** for **911electrics.com** before
switchover: run a full Semrush audit, inventory every old URL, and seed the
complete old→new **301 redirect map** so no rankings/backlinks are lost. Then
close any remaining on-page SEO gaps.

## Prerequisites for the new session (confirm these are available)
1. **Semrush MCP** connected (was disconnected previously). Tools: `mcp__Semrush__*`
   (`siteaudit_research`, `organic_research`, `backlink_research`,
   `overview_research`, `keyword_research`, `get_report_schema`, `execute_report`).
   Workflow: discovery tool → `get_report_schema` → `execute_report`. Default
   `database` = `us`.
2. **Network egress allowlist** includes `911electrics.com` and
   `www.911electrics.com`. Previously both WebFetch and curl were blocked
   (`Host not in allowlist`) and the site also 403s bots. If still blocked, rely
   on Semrush + a user-provided GSC/sitemap export.
3. GitHub MCP scoped to `alwayzlegit/911electrics`; Supabase MCP project
   `hywqbbjwepliduwamhip`; Vercel project `prj_dyzjtrgRDs9965A8CAXKA8QCkKPe`,
   team `team_di6oiEhCIT17lNXsonHt3mSc`.
4. Dev branch: `claude/festive-knuth-qmrwgy`. Commit trailer:
   `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` + the
   `Claude-Session` line. PR → wait for **Vercel build + GitHub Actions `check`**
   green → squash-merge → `git fetch origin main && git reset --hard origin/main`.

## What's already done (don't redo)
- Strong SEO foundation: per-page metadata + canonical
  (`src/utilities/buildMeta.ts`, `canonicalHost.ts`), full JSON-LD
  (`src/lib/schema-org.ts` — Electrician/Service/FAQ/BlogPosting/Breadcrumb/
  AggregateRating), `src/app/sitemap.ts`, per-host `src/app/robots.ts`,
  `trailingSlash: true`.
- Static infra redirects in `redirects.ts`: Yoast sitemaps, `/feed`,
  `/comments/feed`, `/wp-admin*`, `/author/*`, `/category/uncategorized`, plus a
  `/wp-content/uploads/*` catch-all.
- **Redirects manager (shipped)**: table `public.url_redirects
  (id, source, destination, permanent, created_at, updated_at)`; `next.config`
  `redirects()` merges static + DB rows **at build time** (best-effort; static
  infra redirects win on conflict). Studio → **Redirects** (admin) has
  add/edit/delete + **bulk import** (`/old/, /new/` per line).
  **Redirects apply on next deploy.**

## Confirmed URL parity (already good)
- **43 city pages** — new slugs exactly match the live URLs
  (`electrician-burbank-ca`, `electrician-toluca-lake-ca`, …) via `/[slug]/`.
  `/services/los-angeles-ca/` preserved via `path_override`.
- Static pages present: `/`, `/services/`, `/service-areas/`, `/contact/`,
  `/blog/`, `/privacy-policy/`, `/terms-of-service/`.

## The gap to close
Service URLs were **restructured**. Live WordPress uses nested paths; the new
site uses **6 flat slugs**:
```
electrical-panel-upgrades-los-angeles-ca
electrical-repairs-los-angeles-ca
emergency-electrician-los-angeles-ca
ev-charger-installation-los-angeles-ca
lighting-installation-upgrades-los-angeles-ca
new-construction-electrical-los-angeles-ca
```
Known live URLs with **no redirect yet** (sample from a `site:` search — needs
the full list): `/services/electrical/`, `/services/electrical/residential/`,
`/services/electrical/commercial/industrial-electrical-los-angeles-county/`,
`/residential`, `/our-company`. These 404 on switchover unless mapped.

## Tasks
1. **Inventory** every indexed/old URL: Semrush `organic_research` (organic
   pages for `911electrics.com`) + `siteaudit_research`; and/or fetch
   `https://911electrics.com/sitemap_index.xml` (+ sub-sitemaps) once egress is
   allowed. Reconcile against the new `sitemap.xml`.
2. **Diff** old URLs vs new routes/slugs (cities already covered). Map each
   retired URL to its closest live page (service-category pages → best matching
   service or `/services/`; decide `/our-company` → home, `/contact/`, or build
   an About page; verify old image URLs are covered by the `wp-content/uploads`
   catch-all).
3. **Load the 301s**: Studio → Redirects → Bulk import, **or**
   `INSERT … INTO public.url_redirects` via Supabase MCP. Keep them permanent
   (301). **Redeploy** so `next.config` picks them up; verify a sample (301 from
   source → 200 at destination).
4. **On-page gaps** from the Semrush site audit: missing/dup titles & meta, thin
   content, broken internal links, Core Web Vitals/LCP, missing `alt`, orphan
   pages, canonical/HTTPS issues.
5. **Keyword/competitor gaps** (Semrush `keyword_research` + competitor
   `organic_research`): high-intent local terms (per-city + per-service);
   recommend/scaffold **programmatic service×city landing pages** (services × 43
   cities) if there's a gap — big local-SEO lever.
6. **Report**: parity table (old URL → status/redirect), prioritized on-page
   fixes, keyword gaps, programmatic-pages recommendation.

## Acceptance criteria
- Every old indexed URL either resolves on the new site or has a 301 in
  `url_redirects`.
- `sitemap.xml` ⊇ all canonical new URLs; no indexable URL 404s.
- Semrush site-audit blocking issues triaged (fixed or ticketed).
- Redirect map verified live post-deploy.

## Refs / gotchas
- New routes: `src/app/(frontend)/**` (`[slug]` resolves services/cities/posts;
  specific routes for blog, category, services, services/los-angeles-ca, contact,
  legal).
- Slugs: `SELECT slug FROM services WHERE _status='published'` /
  `SELECT slug, path_override FROM cities WHERE _status='published'`.
- Bulk redirect target table: `public.url_redirects`.
- `pnpm build` fails locally at page-data collection
  (`ECONNREFUSED 127.0.0.1:5433`, no local DB) — expected; rely on
  `pnpm typecheck` + `pnpm test` + the Vercel PR build.
