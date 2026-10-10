# Pre-cutover comparison: live site vs new Vercel project

Crawled 2026-10-09 from the owner's own Chrome with
[`browser-crawl.js`](browser-crawl.js), read-only (GET only), because the cloud
sandbox's network policy refused both hosts.

|                     | Live (`911electrics.com`, old Vercel account)                    | New (`911electrics-cntkjc49z-…vercel.app`, preview) |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Crawled at (UTC)    | 19:16:20                                                         | 19:18:21                                            |
| Paths crawled       | 576                                                              | 576                                                 |
| URLs in sitemap.xml | 557                                                              | 557                                                 |
| 200                 | 560                                                              | 560                                                 |
| 3xx (redirects)     | 16                                                               | 16                                                  |
| Fetch errors        | 0                                                                | 0                                                   |
| Home canonical      | `https://911electrics.com/`                                      | `https://911electrics.com/`                         |
| Home `X-Robots-Tag` | none                                                             | `noindex`                                           |
| robots.txt          | `Allow: /`, `Disallow: /studio`, `Disallow: /api/`, sitemap line | `Disallow: /`                                       |

## Reading it

- **This compares the same app on two hosts, not WordPress against Next.js.** The live
  domain already runs this Next.js code, from the old repo's `main` (`f435d80`) on the
  old Vercel account. The preview is commit `6e8df48`, which is `f435d80` plus docs,
  `scripts/seo-crawl.mjs`, the baseline CSVs and a SQL file recording the `vercel_app`
  role. `git diff --stat f435d80 6e8df48` shows no change under `src/`, nor to
  `next.config.ts`, `redirects.ts` or `vercel.json`. What the comparison tests is the new
  project's configuration: database, env vars and canonical host.
- **Database.** The sitemap is built per request from Postgres. Both hosts return the same
  557 URLs, so the new project reads the same data through the `vercel_app` role.
- **Canonical host.** The new deployment's canonical points at `https://911electrics.com/`,
  so `NEXT_PUBLIC_SERVER_URL` is set correctly.
- **Indexing guard.** `noindex` plus `Disallow: /` on the preview, and neither on the live
  home page. This is exactly the expected behaviour for a non-canonical host, and it lifts
  automatically once the domain points at the new project.
- **Redirects.** 16 redirects on each side. That includes the 3 Studio-managed
  `url_redirects` rows, which load at build time from the database.

## Not yet done

The row-by-row diff (title, H1, canonical and JSON-LD per path) needs `crawl-live.tsv` and
`crawl-new.tsv`, which were downloaded to the owner's machine. Once they're added here:

    node scripts/seo-crawl.mjs diff migration-baseline/crawl-live.tsv migration-baseline/crawl-new.tsv --ignore-robots

The browser crawler records redirects as `3xx` with the final path (see HANDOFF-CHROME.md),
the same way on both runs.

## Verdict

**GO, conditional.** Every summary-level gate in CUTOVER.md passes: identical counts,
identical sitemap, correct canonical, noindex only on the non-canonical host, and no errors.
Confirm the row-level diff shows 0 differences before cutover night.
