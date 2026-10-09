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
- [ ] The same crawl against the new deployment (`VERCEL_BYPASS=… node scripts/seo-crawl.mjs
  crawl https://911electrics-info911electrical-4885.vercel.app migration-baseline/crawl-new.tsv`)
      diffs clean: `node scripts/seo-crawl.mjs diff migration-baseline/crawl-live.tsv
  migration-baseline/crawl-new.tsv --ignore-robots` → **0 differences**.
- [ ] On the new deployment the robots headers read `noindex`, which is correct
      for a non-canonical host. This proves `NEXT_PUBLIC_SERVER_URL` is set.
- [ ] Manual: a test quote submitted → row in `leads` + email arrives → test row deleted;
      Studio login + 2FA; `/api/cron/tick` without the secret → 401/503.

## Env var checklist (new project)

| Variable                                                                                                                         | Status                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| NEXT_PUBLIC_SERVER_URL, SUPABASE_URL, NEXT_PUBLIC_POSTHOG_KEY/HOST, POSTHOG_HOST, POSTHOG_PROJECT_ID, SENTRY_ORG, SENTRY_PROJECT | set                                                                     |
| RESEND_API_KEY                                                                                                                   | set (new sending-only key `vercel-911electrics-prod`)                   |
| DATABASE_URL (pooler, :6543)                                                                                                     | **needed**, from the old project                                        |
| PAYLOAD_SECRET                                                                                                                   | **needed**, same value as the old project, or all admins get signed out |
| SUPABASE_SERVICE_ROLE_KEY                                                                                                        | **needed**                                                              |
| CRON_SECRET                                                                                                                      | **needed** (a new value is fine)                                        |
| BLOG_API_TOKEN, LEADS_API_TOKEN                                                                                                  | **needed**, same values as the old project                              |
| LEAD_FROM_EMAIL, LEAD_NOTIFICATION_EMAIL                                                                                         | **needed**                                                              |
| SENTRY_AUTH_TOKEN                                                                                                                | **needed** (Sentry org token)                                           |
| POSTHOG_API_KEY                                                                                                                  | **needed** (PostHog personal key)                                       |
| `TWILIO_*`, `TURNSTILE_*`, `GOOGLE_CLIENT_*`, `NEXT_PUBLIC_GA_ID`                                                                | copy whatever the old project has                                       |

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
     `--ignore-robots`. The result must be 0 differences.

## Rollback

Remove the domains from the new project, re-add them to the old project, and
unpause it. The database is shared, so no data is lost either way.

## After cutover

- Search Console: resubmit `https://911electrics.com/sitemap.xml` (same property, no change of address).
- Watch Vercel 404s, Sentry and PostHog for 48 h.
- Semrush Site Audit (project 29905821, daily): health ≥ 95%, 0 4xx/5xx, 0 noindex
  (see README.md). Position Tracking weekly for 4 weeks.
- Day 30: delete the old Vercel project, revoke the old Resend key, archive
  `AlwayzLegit/911electrics` with a pointer to the new repo.
