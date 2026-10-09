# 911electrics.com

The website for 911 Construction & Electric Inc. — a licensed electrical
contractor in Pasadena, CA. Migrated from WordPress with the legacy URLs,
`<title>`s and `<h1>`s preserved verbatim, and live on the real domain.

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Data:** Postgres on Supabase, read through a typed `pg` layer with
  on-demand ISR — no CMS framework
- **Admin:** a custom app, "Studio", at `/studio`
- **Media:** Supabase Storage (`media` bucket), plus the migrated WordPress
  images committed under `public/media`
- **Hosting:** Vercel, with two daily crons
- **Monitoring:** Sentry (errors), PostHog (product analytics), optional GA4

> There was previously a Payload CMS install behind `/admin`. It was removed
> entirely; anything describing it is out of date.

## Local development

```bash
pnpm install
cp .env.example .env   # then fill in real values — every variable is documented there
pnpm dev               # http://localhost:3000, admin at /studio
```

There is no local database seed: `DATABASE_URL` points at the shared Supabase
Postgres, so **local development reads and writes production content.** Treat
Studio edits accordingly.

| Command | |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (`pnpm test:watch` to watch) |

CI runs lint, typecheck and the unit tests on every PR. The production build is
validated by the Vercel deployment check instead, since it needs `DATABASE_URL`.

## Architecture

### Routing

Services, service areas (cities) and blog posts all render at `/{slug}/`,
mirroring WordPress. `src/app/(frontend)/[slug]/page.tsx` resolves a slug
against each collection in turn.

- **Services** — six, e.g. `/ev-charger-installation-los-angeles-ca/`
- **Service areas** — 57, `/electrician-{city}-ca/`. Los Angeles itself is
  special: `/services/los-angeles-ca/`.
- **Service × city** — ~348 programmatic combos, `/{service}-{city}-ca/`,
  built by `src/lib/service-city.ts` and rendered by
  `src/templates/ServiceCityPage.tsx`. Proximity between service areas comes
  from `src/lib/city-regions.ts`.
- **Blog** — `/blog/`, `/category/{slug}/`, both paginated

### Data layer

`src/db/client.ts` holds a single `pg` pool; `src/db/queries.ts` and
`src/lib/{queries,posts,services,cities}.ts` are the read paths, wrapped in
`unstable_cache` with tags. Writes go through server actions
(`src/app/actions/*`) which `revalidateTag` what they touched, so content
changes go live in seconds with no redeploy.

Schema changes are hand-written SQL in `db/migrations/`, applied manually — see
that directory's README.

If content is edited directly in the database (outside the app), nothing calls
`revalidateTag`, so flush the cache explicitly:

```bash
curl -X POST https://911electrics.com/api/revalidate \
  -H "Authorization: Bearer $BLOG_API_TOKEN"
```

### Admin API (`/api/admin/v1`)

One API for everything an automation or an AI agent needs to run the site.
`GET /api/admin/v1` with any valid key returns a self-describing index: every
endpoint, the scope each operation needs, and whether the calling key has it.
`src/lib/api-catalog.ts` is that index as data, and a test checks it against the
route files so it cannot drift.

Access is by **keys created in Studio → API keys** — named, scoped
(`posts:write`, `leads:read`, `*:read`, `*` …), optionally expiring, revocable
instantly, stored only as a hash, and named in the audit log on every write.
Every handler states the one scope it needs: `await authorize(req, 'posts:write')`
(`src/lib/api-auth.ts`). Everything fails closed.

The pre-v1 URLs (`/api/blog/*`, `/api/content/*`, `/api/leads`,
`/api/revalidate`) are thin re-export aliases, and the original env-var tokens
still work as fixed-scope legacy keys, so existing integrations are unaffected.

### Studio (`/studio`)

Leads CRM with a pipeline board, blog editor (a custom Lexical WYSIWYG) with
revision history and scheduled publishing, services / service areas / reviews /
business-info editors, a redirects manager, team management, an audit log, and
an integration-health page at `/studio/setup`.

Auth verifies PBKDF2 credentials against the `users` table and issues an
HMAC-signed `studio_session` cookie referencing a revocable row in
`studio_sessions`. TOTP two-factor is supported, with recovery codes. Both the
password and 2FA steps are rate-limited per account and per IP.

### SEO

- Legacy WordPress URLs, `<title>`s and `<h1>`s are preserved **verbatim**.
  Retired URL structures 301 to their new homes via `redirects.ts`, including
  `www` → apex and `/wp-content/uploads/*` media paths.
- `src/app/sitemap.ts` queries the database per request, so a post published
  through the API appears immediately without a redeploy.
- JSON-LD (`src/lib/schema-org.ts`): Electrician, Service, FAQPage,
  BreadcrumbList.
- Any non-canonical host (a preview deploy, the `*.vercel.app` domain) gets an
  `X-Robots-Tag: noindex` from `src/proxy.ts`.
- `/llms.txt` summarizes the site for language models.

**Do not change titles, H1s or slugs** without a deliberate SEO decision —
they are load-bearing for rankings that the business depends on.

### Leads

The quote forms post to `src/app/actions/submit-lead.ts`: validate → spam-score
(honeypot, time-trap, per-IP burst counting, optional Turnstile) → insert →
notify. A submission that looks like spam is **still saved**, flagged `spam`, so
a false positive is recoverable from Studio. Only a genuine flood from one IP is
dropped. Email, the customer auto-reply and the owner SMS are all best-effort
and never block the insert; failures are recorded on the lead.

### Scheduled work

`vercel.json` runs `/api/cron/tick` twice daily. It publishes any scheduled
posts that have come due and sends follow-up reminders for stale leads.

## Operations

- **[OWNERS-GUIDE.md](OWNERS-GUIDE.md)** — the non-technical handbook
  (editing content, publishing posts, managing quote requests)
- **[HANDOFF-LIVE-QA.md](HANDOFF-LIVE-QA.md)** — production QA checklist
- **[HANDOFF-SEO.md](HANDOFF-SEO.md)** — the SEO migration record
- **[HANDOFF-BLOG-AUTOMATION.md](HANDOFF-BLOG-AUTOMATION.md)** — programmatic
  posting via `/api/blog/publish`
- **[TESTING-AND-IMPROVEMENTS.md](TESTING-AND-IMPROVEMENTS.md)** — backlog from
  the Payload removal

`wp-snapshot/` is the frozen capture of the legacy WordPress site (HTML, REST
exports, Yoast metadata) — the migration source of truth. Keep it for
provenance when auditing an SEO regression.
