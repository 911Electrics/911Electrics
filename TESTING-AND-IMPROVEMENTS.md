# 911 Electric — Handoff: Testing & Improvements

Context: Payload CMS has been fully removed. The public site reads from Postgres
(Supabase) directly via a typed `pg` layer with on-demand ISR, and the admin is
now a custom app at **`/studio`** (no more `/admin`). This doc is for verifying
the system and a prioritized list of follow-up improvements.

---

## 1. Architecture at a glance

| Area | Before | Now |
|---|---|---|
| Public reads | Payload local API | `src/db` + `src/lib/*.ts` (`pg`), cached with `unstable_cache` tags |
| Page rendering | build-time SSG | on-demand ISR (`/[slug]`, revalidate 1h) |
| Rich text | `@payloadcms/richtext-lexical/react` | standalone renderer `src/components/RichText` |
| Admin | Payload `/admin` (crashed) | custom Studio `/studio` |
| Admin auth | Payload login/JWT | PBKDF2 verify vs `users` table + HMAC-signed `studio_session` cookie |
| Lead capture | `payload.create` | `INSERT` into `leads` via `pg` |
| Editor | Payload Lexical | custom WYSIWYG (`src/studio/editor`, Lexical 0.41) |
| Images | Payload `<Media>` | `next/image` from `/public/media` + a Studio media picker |

Key env vars still required: `DATABASE_URL`, `PAYLOAD_SECRET` (now reused to
sign Studio sessions — **do not rotate without forcing re-login**),
`RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL` (optional), `TURNSTILE_SECRET_KEY`
(optional), Sentry/GA keys.

---

## 2. Test plan

Test on production (`https://911electrics.vercel.app` or the custom domain)
after the deploy finishes. **Studio writes hit the live database** — use
throwaway data / drafts.

### 2a. Public site (read-only — low risk)
- [ ] `/` — hero, service cards (with images), about (rich text), reviews
- [ ] `/ev-charger-installation-los-angeles-ca/` — service intro, benefits, features, FAQs, gallery
- [ ] `/electrician-burbank-ca/` — `{city}` interpolation, FAQs, service cards
- [ ] `/services/los-angeles-ca/` — the LA hub page
- [ ] `/blog/` — featured + grid + sidebar (categories w/ counts, recent posts) + pagination
- [ ] open a blog post — formatting, **"On this page" anchors jump correctly**, links, prev/next, related
- [ ] `/category/electrical-tips/` — filtered list
- [ ] `/sitemap.xml` and `/robots.txt`
- [ ] `/contact/`, `/privacy-policy/`, `/terms-of-service/`
- [ ] `/admin` → should 404 / redirect to `/studio`
- [ ] spot-check page source for correct `<title>`, meta description, OG image, JSON-LD

### 2b. Studio — `/studio`
- [ ] **Log in** with existing credentials (sign in once; old session is dropped)
- [ ] **Dashboard** — lead stats + recent leads load
- [ ] **Reviews** — create a throwaway → toggle Feature (check homepage) → edit → **delete**
- [ ] **Business Info** — change hours label, Save, confirm header/footer update, revert
- [ ] **Blog Posts** — open a **draft** → editor loads existing formatting → bold/heading/list/link → Save → view on site
- [ ] **Blog Posts** — create a new draft, publish, confirm it appears on `/blog/`, then delete
- [ ] **Services** — open one → intro + each FAQ load in the editor; benefits/features/gallery populate; Save
- [ ] **Service Areas** — open one → overrides/neighborhoods/FAQ overrides load; Save
- [ ] Sign out → confirm `/studio` redirects to login

### 2c. Lead capture (HIGHEST PRIORITY — revenue path)
- [ ] Submit the **Get a Free Quote** form on `/` (wait ~3s; there's an anti-spam delay)
- [ ] Confirm the **notification email** arrives
- [ ] Confirm the lead appears in **Studio → Quote Requests**, with correct fields
- [ ] In the lead detail, change **status** → confirm it persists and the dashboard count updates

### 2d. Cross-cutting
- [ ] Mobile layout (header nav, sticky call bar, Studio sidebar)
- [ ] Cache freshness: after a Studio edit, the public page updates within a moment (revalidation)

---

## 3. Known risks / things to watch

1. **Lead form** — the DB insert is verified, but confirm a real end-to-end browser
   submission + email once. This is the only revenue-critical write.
2. **Studio editor with rich content** — verified headlessly that all existing node
   types round-trip; still worth opening a few real posts/services to confirm.
3. **Google Reviews auto-sync was removed** with Payload (`sync-google-reviews`).
   If reviews were syncing from Google automatically, that no longer happens —
   reviews are now managed manually in Studio → Reviews. Re-add a sync job if needed.
4. **No draft *preview*** — Studio has draft/published status, but no "preview before
   publish" view; published edits go live on save (with cache revalidation).
5. **No revision history** — Payload's versions were dropped; there's no undo/restore.
6. **Automated tests were deleted** (they were Payload integration tests). There is
   currently no test suite.
7. **Media uploads** — Studio can *pick* from existing media only; you can't upload a
   *new* image yet (see Improvements §4.1).
8. **Single admin session secret** — `PAYLOAD_SECRET` signs Studio sessions; rotating
   it logs everyone out (and it's misleadingly named now).

---

## 4. Suggested improvements (prioritized)

### Priority 1 — close the gaps from removal
1. **Media upload → Vercel Blob.** Add a Blob store + `@vercel/blob`, an upload action,
   and wire it into the media picker so new images can be added (not just chosen).
   Update `next.config` image `remotePatterns` for the Blob host.
2. **Re-create Google Reviews sync** (if it was used) as a scheduled function
   (Vercel Cron) writing to the `testimonials` table.
3. **A couple of smoke tests** (Playwright): home renders, a post renders, the lead
   form creates a row, Studio login works. Cheap insurance against regressions.

### Priority 2 — Studio polish
4. **Rename the session secret** to a dedicated `SESSION_SECRET` (fall back to
   `PAYLOAD_SECRET`), and add basic **login rate-limiting**.
5. **Password reset / change-password** in Studio (the `users` table has
   `reset_password_*` columns already).
6. **Slug auto-suggest + uniqueness hint** in the editors (currently errors on save if
   a slug collides).
7. **Inline image insertion in the rich-text editor** (image picker → Lexical node)
   once Blob upload exists.
8. **Bulk actions** on leads (mark several contacted, export CSV).

### Priority 3 — hardening & quality
9. **DB connection pooling review** — the `pg` pool is `max: 5`; validate under load
   and confirm it plays well with Supabase's pooler limits.
10. **Enforce the CSP** — there's a report-only Content-Security-Policy in `src/proxy.ts`;
    once reports are clean, flip it to enforcing.
11. **Error monitoring** — confirm Sentry captures Studio action failures; add a
    `SENTRY_AUTH_TOKEN` build env var so source maps upload.
12. **Performance/SEO pass** — Lighthouse on key pages; verify image sizes, LCP, and
    that all canonical/OG tags survived the metadata refactor (`src/utilities/buildMeta.ts`).
13. **Accessibility audit** of Studio forms (labels, focus, keyboard nav for the editor).

### Priority 4 — nice-to-have
14. Draft **preview** links from Studio.
15. Lightweight **revision history** (store prior content JSON on update).
16. **Team accounts / roles** if more than one editor is expected.

---

## 5. Where things live (quick map)

- DB client + base queries: `src/db/client.ts`, `src/db/queries.ts`, `src/db/types.ts`
- Public readers: `src/lib/{queries,posts,services,cities}.ts`
- Templates: `src/templates/{ServicePage,CityPage,BlogPostPage}.tsx`
- Rich-text renderer: `src/components/RichText/index.tsx`
- Studio app: `src/app/(studio)/studio/**`
- Studio auth: `src/studio/auth.ts`
- Studio readers: `src/studio/{leads,settings,services,cities,posts,testimonials,media}.ts`
- Studio write actions: `src/app/actions/studio-*.ts`
- WYSIWYG editor: `src/studio/editor/**`
- Lead capture: `src/app/actions/submit-lead.ts`
