# Cutover runbook: old Vercel account → Vercel project `911electrics`

New project: `prj_zDiCYh4oJVyjU5yU4jU8BbNwPeVq` on the `info911electrical-4885`
account, deploying `main` of `911Electrics/911Electrics`. Database, Sentry,
PostHog and Resend are unchanged, so there is no data to move and rollback is
just moving the domain back.

## Gate: all must be true before step 1

- [ ] New account upgraded to **Pro** (Hobby forbids commercial use).
- [ ] All env vars imported (see the checklist below), and a production deploy of
      `main` is **READY**.
- [ ] `node scripts/seo-crawl.mjs crawl https://911electrics.com migration-baseline/crawl-live.tsv`
      has been run against the **old** live site.
- [ ] The same paths crawled on the new deployment, then diffed:

      VERCEL_BYPASS=… node scripts/seo-crawl.mjs crawl https://911electrics-info911electrical-4885.vercel.app migration-baseline/crawl-new.tsv --paths-from migration-baseline/crawl-live.tsv
      node scripts/seo-crawl.mjs diff migration-baseline/crawl-live.tsv migration-baseline/crawl-new.tsv --ignore-robots

      → **0 differences** (`--paths-from` re-checks every live path, so a page
      missing from the new sitemap shows up as a 404 instead of being skipped).

- [ ] On the new deployment the robots headers read `noindex`, which is correct
      for a non-canonical host. This proves `NEXT_PUBLIC_SERVER_URL` is set.
- [ ] Manual: a test quote submitted → row in `leads` + email arrives → test row deleted;
      Studio login + 2FA; `/api/cron/tick` without the secret → 401/503.

## Env var checklist (new project)

Already set: `NEXT_PUBLIC_SERVER_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_HOST`, `POSTHOG_PROJECT_ID`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `RESEND_API_KEY` (new sending-only key), `LEAD_FROM_EMAIL`
(`hello@911electrics.com`), `LEAD_NOTIFICATION_EMAIL` (`info@911electrics.com`).

Still to add (all from dashboards, no CLI needed):

| Variable                    | Where it comes from                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Set a password on the dedicated `vercel_app` role (db/migrations/20261009_vercel_app_role.sql), then `postgresql://vercel_app.hywqbbjwepliduwamhip:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → service_role                                                                                                                                                            |
| `PAYLOAD_SECRET`            | Any new random 64-char string. Studio users sign in again once; nothing else depends on it (2FA secrets are not encrypted with it, and no Google tokens are stored)                                              |
| `CRON_SECRET`               | Any new random string                                                                                                                                                                                            |
| `BLOG_API_TOKEN`            | The token the blog-writing automation sends (it posted 94 times in the last 45 days, so it must keep working). Same value as the old project, or a new value that the automation is also switched to             |
| optional                    | `SENTRY_AUTH_TOKEN` (readable stack traces), `POSTHOG_API_KEY` (Studio analytics tab), `TURNSTILE_*` (Cloudflare, currently live per Sentry), `TWILIO_*`, `NEXT_PUBLIC_GA_ID`                                    |

## Cutover (≈15 min, weekday late evening Pacific)

1. Lower nothing in DNS. Records stay pointed at Vercel; only project ownership moves.
2. New project → Settings → Domains → add `911electrics.com` and `www.911electrics.com`.
   Vercel will ask for a `_vercel` TXT record because the domain is held by another
   account. Add it at the DNS host and wait for "Verified".
3. Old account → old project → Domains → **remove** both domains. The new project
   serves them within seconds to a minute.
4. Old project → Settings → **Pause** it (stops its crons). Do not delete it.
5. Verify immediately:
   - `curl -sI https://911electrics.com/`: 200, **no** `x-robots-tag`, served by the new deployment.
   - `curl -sI https://www.911electrics.com/`: 308 → apex.
   - Re-run the crawl against the live domain, then diff against `crawl-live.tsv` **without**
     `--ignore-robots`, passing `--paths-from migration-baseline/crawl-live.tsv`. The result must be 0 differences.

## Rollback

Remove the domains from the new project, re-add them to the old project, and
unpause it. The database is shared, so no data is lost either way.

## After cutover

- Search Console: resubmit `https://911electrics.com/sitemap.xml` (same property, no change of address).
- Watch Vercel 404s, Sentry and PostHog for 48 h.
- Semrush Site Audit (project 29905821, daily): health ≥ 95%, 0 4xx/5xx, 0 noindex
  (see README.md). Position Tracking weekly for 4 weeks.
- Expect a short burst of Sentry "Failed to find Server Action" (911ELECTRICS-WEB-D) from
  tabs opened before cutover. It already occurs on every deploy and is not a regression.
- Day 30: delete the old Vercel project, revoke the two old Resend keys named "Onboarding", archive
  `AlwayzLegit/911electrics` with a pointer to the new repo.

## Notes

- The build **fails** without `DATABASE_URL` (`/studio/leads/export` needs it at
  page-data collection), so a deploy that is missing it cannot go live by accident.
  A set-but-unreachable `DATABASE_URL` would still build, but without the 3
  `url_redirects`. The crawl covers those three sources.
- Pre-existing, not touched: a blog category `maecenas` (looks like placeholder
  text) exists in the database and so has a `/category/maecenas/` page. Removing
  it is an SEO decision for the owner and is out of scope for the move.
