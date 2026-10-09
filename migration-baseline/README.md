# 911electrics.com: pre-migration SEO baseline

Captured 2026-10-09, before the move from `AlwayzLegit/911electrics` (and its
current Vercel account) to `911electrics/911electrics` on the new Vercel
account. Every post-cutover check is compared against this.

Source: Semrush (US database), Site Audit project `29905821`, Supabase
project `hywqbbjwepliduwamhip`.

## Organic visibility (Semrush, US)

| Month | Keywords | Top 3 | 4–10 | Est. traffic |
|---|---|---|---|---|
| 2026-09 | **181** | 2 | 10 | **43** |
| 2026-08 | 134 | 2 | 9 | 51 |
| 2026-07 | 67 | 0 | 5 | 11 |
| 2026-06 | 38 | 0 | 1 | 6 |

The trend is still climbing after the WordPress → Next.js launch. Full
history is in `rank-history-us.csv`, and every ranking keyword (166 rows, duplicates collapsed)
with its URL is in `keywords-us.csv`.

### Keywords in the top 10 (protect these)

| Keyword | Pos | Vol | URL |
|---|---|---|---|
| circuit breaker upgrades highland park | 3 | 260 | /electrician-highland-park-los-angeles/ (blog post) |
| electrical panel upgrade montrose | 4 | 90 | /electrician-montrose-ca/ |
| 24/7 electrician pasadena | 5 | 50 | /emergency-electrician-pasadena-ca/ |
| commercial electrician altadena | 6 | 40 | /electrician-altadena-ca/ |
| temporary power glendale ca | 6 | 260 | /temporary-power-pole-installation-los-angeles/ |
| emergency electrician los angeles | 7 | 210 | /emergency-electrician-los-angeles-ca/ |
| how to add sub panel | 7 | 50 | /subpanel-installation-los-angeles/ |
| ev charger installation van nuys | 7 | 50 | /electrician-van-nuys-ca/ |
| commercial electrician services altadena | 7 | 40 | /electrician-altadena-ca/ |
| ev charger installation woodland hills | 7 | 50 | /ev-charger-installation-woodland-hills-ca/ |
| licensed electrician altadena | 9 | 50 | /electrician-altadena-ca/ |

### Pages that rank (53 URLs). Each must return 200 with an unchanged title, H1 and canonical

Traffic-bearing: `/electrician-highland-park-los-angeles/`, `/`,
`/temporary-power-pole-installation-los-angeles/`,
`/emergency-electrician-los-angeles-ca/`, `/electrician-montrose-ca/`,
`/emergency-electrician-pasadena-ca/`. The full list with keyword counts is in
`pages-us.csv`.

## Technical health (Semrush Site Audit, snapshot `6ac83428ea0d794b390b170e`)

Site Audit re-crawls daily, so each new crawl after cutover is a direct
before/after comparison.

| Check | Baseline | Must stay |
|---|---|---|
| Site health score | **95%** | ≥ 95% |
| Pages crawled | 587 | ≈ 587 |
| 5xx / 4xx pages | 0 / 0 | 0 / 0 |
| Broken internal links / images | 0 / 0 | 0 / 0 |
| Pages blocked by `X-Robots-Tag: noindex` | **0** | **0** (the main migration risk) |
| Duplicate titles / meta descriptions | 0 / 0 | 0 / 0 |
| Broken / multiple canonicals | 0 / 0 | 0 / 0 |
| Redirect chains or loops | 0 | 0 |
| Incorrect pages in sitemap | 0 | 0 |
| www resolve issues | 0 | 0 |
| Structured-data markup errors | 0 | 0 |
| robots.txt / sitemap / llms.txt found | yes / yes / yes | yes |
| Known pre-existing, not migration-related | 1 slow page, 5 long titles, 444 H1=title, 583 low text/HTML ratio, 87 pages >3 clicks deep, 5 "content not optimized", 1 external 403 | unchanged |

## Database state (Supabase)

- 142 published posts, 58 cities, 6 services, 126 leads
- `url_redirects` (build-time redirects, need `DATABASE_URL` at build):
  - `/evitp-certification-ev-charger-incentives-los-angeles` → `/why-evitp-certification-matters-for-ev-charger-incentives-los-angeles/`
  - `/residential` → `/services/`
  - `/our-company` → `/`

## Not captured yet

The direct per-URL crawl (status, title, H1, canonical, robots, JSON-LD for
every sitemap URL and every legacy redirect source) is still missing. This
session's network policy blocks `911electrics.com`. Once that host is
allowed, the crawl runs and its output lands here as `crawl-live.csv`.
