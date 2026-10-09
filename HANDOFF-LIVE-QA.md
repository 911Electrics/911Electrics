# 911 Construction & Electric — Live QA Handoff (Production Browser Testing)

**Audience:** a testing agent (or person) with a real browser.
**Goal:** verify the public website **and** the Studio admin on the live production
domain after the WordPress→Next.js migration and DNS cutover.
**Date prepared:** 2026-06-20 · **Status:** site is LIVE on the real domain.

---

## 0. Read this first — cautions

This tests **live production**. There is no staging copy of the data.

- **The database is live.** Studio writes (create/edit/delete services, cities,
  posts, testimonials, settings, users) hit real production data. Only create
  clearly-labeled **TEST** records and **delete them when done**. Do **not** edit
  or delete real content, real leads, real users, or Site Settings.
- **Lead forms send real emails** (and possibly an SMS to the owner). Use the
  test markers below so the owner knows to ignore them.
- **The Blog API publishes real, public, indexable posts.** Use the
  "Safe To Delete" title and remove them after.
- **Do not change passwords, 2FA, or domain/DNS settings.**
- If anything looks destructive or you're unsure, **stop and ask** rather than proceed.

---

## 1. Environment & access

| Item | Value |
|---|---|
| Public site | https://911electrics.com |
| `www` | https://www.911electrics.com (should redirect to apex) |
| Studio admin | https://911electrics.com/studio |
| Admin login | https://911electrics.com/studio/login |
| Sitemap | https://911electrics.com/sitemap.xml |
| Robots | https://911electrics.com/robots.txt |
| Business phone | **747-255-8595** (`tel:+17472558595`) |
| Address | 1308 East Colorado Blvd Ste 141, Pasadena, CA 91106 |
| Email | info@911electrics.com |
| CA License # | 1027421 |

### Credentials & secrets — FILL IN before starting (provided separately, keep secret)
- **Studio admin email:** `__________`
- **Studio admin password:** `__________`
- **Blog API token (`BLOG_API_TOKEN`):** `__________`
- **A safe test phone/email** to use in lead forms: `__________`

> The agent must be given the Studio login and Blog API token out-of-band — they
> are not in this document.

---

## 2. Five-minute smoke test (do this first)

1. `https://911electrics.com` loads, looks styled (brand **red**, logo top-left), no console errors.
2. Top nav has **Home, Services ▾, Service Areas ▾, About Us, Blog, Contact** + "Get a Free Quote".
3. Click the **logo** while already on the homepage → page **smooth-scrolls to top** (doesn't reload/no-op).
4. Open one service page, one city page, one blog post — all render.
5. Submit the hero quote form with test data → success message appears.
6. Log into **/studio** → dashboard loads with KPIs.
7. `robots.txt` shows `Allow: /` (not `Disallow: /`) and a `Sitemap:` line.

If all 7 pass, proceed to the full plan. If #1, #6, or #7 fail, stop and report immediately.

---

## 3. Public website tests

### 3.1 Homepage (`/`)
- [ ] Hero: heading, **single** primary CTA = **"Call 747-255-8595"** (there should be **no** "or request a callback" link), quote form alongside.
- [ ] Sections render: services, process/why-us, **About** (`/#about`), reviews/testimonials, FAQ, contact.
- [ ] **About section** lists credentials: **EVITP Certified**, **Licensed Class "B" General Building Contractor**, **C-10 Licensed Electrician**.
- [ ] Exactly **one `<h1>`** on the page (use devtools: `document.querySelectorAll('h1').length` → 1).
- [ ] Footer: logo on white chip, address, phone, email, services list, **service-areas grid**, social links, license #.
- [ ] Sticky mobile bottom bar (on phone width): "Call 24/7" + "Free Quote".

### 3.2 Navigation / UX
- [ ] **Services ▾** dropdown lists all 6 services; links work.
- [ ] **Service Areas ▾** dropdown lists cities (long list → scrollable/multi-column); links work.
- [ ] Clicking the logo or the current page's nav item scrolls to top (industry-standard behavior).
- [ ] Mobile hamburger menu opens, nav + dropdowns usable, closes correctly.
- [ ] "Skip to main content" link works for keyboard users (Tab on load).
- [ ] Breadcrumbs present on service/city/combo pages.

### 3.3 Service pages (all 6)
URLs:
- `/electrical-repairs-los-angeles-ca/`
- `/electrical-panel-upgrades-los-angeles-ca/`
- `/ev-charger-installation-los-angeles-ca/`
- `/new-construction-electrical-los-angeles-ca/`
- `/lighting-installation-upgrades-los-angeles-ca/`
- `/emergency-electrician-los-angeles-ca/`

For each: [ ] hero + correct title, [ ] features/benefits, [ ] FAQs expand, [ ] images load (correct image — e.g. **EV charger page shows an EV charger, not a thermostat**), [ ] CTA + contact section, [ ] one `<h1>`.

### 3.4 City pages (spot-check ~5 of 43)
Pattern `/electrician-{city}-ca/` — e.g. `/electrician-burbank-ca/`, `/electrician-pasadena-ca/`, `/electrician-glendale-ca/`, `/electrician-santa-monica-ca/`, `/electrician-san-fernando-valley-ca/`.
**Los Angeles is special:** `/services/los-angeles-ca/`.
- [ ] City name appears in heading/title, content renders, services + testimonials + FAQ + CTA present.

### 3.5 Programmatic service×city pages (spot-check ~5)
Pattern `/{service}-{city}-ca/` — e.g. `/ev-charger-installation-burbank-ca/`, `/electrical-panel-upgrades-glendale-ca/`, `/emergency-electrician-pasadena-ca/`.
- [ ] "{Service} in {City}, CA" framing, nearby-cities links, links back to the standalone service & city pages.

### 3.6 Blog
- [ ] `/blog/` lists posts (cards, images, excerpts).
- [ ] Open a post: single `<h1>` (the title), body renders, table-of-contents/headings deep-link, related/CTA.
- [ ] Categories/filters (if shown) work.

### 3.7 Contact & lead forms (test each entry point)
Forms exist in the **hero**, the homepage **contact** section, and the **/contact/** page.
- [ ] Submit valid data (use the **test phone/email**, name it like `QA TEST — ignore`) → success message.
- [ ] **Validation:** invalid phone (e.g. `123`) and invalid email are rejected client-side; name required.
- [ ] `/contact/` shows address, phone, hours, map (if present).
- [ ] After a successful submit, note the time — these will be checked in Studio (§4.3) and for email delivery (§5).

> Submit **at most 2–3** test leads total so the DB stays clean; they'll be deleted in §4.3.

### 3.8 Misc pages
- [ ] `/service-areas/` lists all cities.
- [ ] `/privacy-policy/` and `/terms-of-service/` load.
- [ ] A bogus URL (e.g. `/does-not-exist/`) shows the branded **404** ("Looks like this circuit is dead.") with working links.

### 3.9 SEO / technical (view-source or devtools)
- [ ] `https://911electrics.com/robots.txt` → `Allow: /`, `Disallow: /studio`, `Disallow: /api/`, `Sitemap:` line. **Must NOT be `Disallow: /`.**
- [ ] No `x-robots-tag: noindex` response header on public pages (check Network tab).
- [ ] Each page has a `<link rel="canonical">` pointing to the `https://911electrics.com` URL.
- [ ] `<title>` tags are present and **≤ ~60 chars** (titles were trimmed — flag any that look truncated in Google-style preview).
- [ ] `sitemap.xml` loads and contains service, city, combo, and blog URLs (all `https://911electrics.com`).
- [ ] Open Graph/Twitter meta present (share preview).
- [ ] HTTPS padlock valid; `http://` and `www` both redirect to `https://911electrics.com`.

### 3.10 Old URL redirects (301s)
Old WordPress URLs should 301 to the new equivalents. Spot-check a few (watch Network tab for `301` then `200`):
- [ ] `/wp-admin` → `/studio/`
- [ ] An old blog/category URL (if known) → its new location.
- [ ] Confirm redirects land on a real page (no redirect chains/loops, no 404).

### 3.11 Analytics firing (optional, needs the tools)
- [ ] With an ad/tracker blocker **off**, load a few pages; in Network, confirm requests to PostHog (`*.posthog.com`).
- [ ] No CSP violations in the console that block scripts/styles (the CSP is now **enforced** — a real blockage would break a feature, so flag any `Refused to …` console errors).

---

## 4. Studio admin tests (`/studio`)

> Reminder: live data. Prefer **read/verify**; when testing writes, use TEST
> records and delete them. **Never** delete real content/leads/users.

### 4.1 Auth
- [ ] `/studio` while logged out → redirects to `/studio/login`.
- [ ] Wrong password → friendly error (and it should be recorded — see 4.9).
- [ ] Correct login → dashboard. Logo shown on login + sidebar.
- [ ] **Failed-login attempts** are visible afterward on the dashboard "Security — failed sign-ins" card (admin only).
- [ ] Logout works.
- [ ] (Do **not** test password reset/2FA changes on the real account.)

### 4.2 Dashboard
- [ ] KPIs render (new requests, leads this week, response time, win rate, pipeline value).
- [ ] Charts (leads last 14 days, pipeline funnel, lead sources) render.
- [ ] "Needs attention" + "Recent activity" lists.
- [ ] Admin-only: "Website analytics" card (PostHog) and "Security — failed sign-ins" card.

### 4.3 Leads
- [ ] The **test leads** submitted in §3.7 appear in `/studio/leads` with correct name/phone/service/source page.
- [ ] Open a lead → detail view; change status (e.g. new→contacted), add a note, set estimated value / follow-up date → saves.
- [ ] Pipeline board `/studio/pipeline` reflects the change.
- [ ] CSV export works: `/studio/leads/export` downloads.
- [ ] **Cleanup:** delete the test leads you created (and only those).

### 4.4 Content — Services / Cities / Testimonials
- [ ] Lists load with real content.
- [ ] Create a **TEST** item (e.g. a testimonial "QA TEST — delete"), confirm it saves and (for testimonials) the **featured** toggle works.
- [ ] Edit it, confirm the change persists and the public site reflects it (may take a moment due to caching).
- [ ] **Delete the TEST item.** Do not alter real services/cities.

### 4.5 Blog posts (Studio)
- [ ] `/studio/posts` lists posts.
- [ ] Create a **TEST** draft via the editor (rich text, headings, list, link, image) → saves.
- [ ] Revision history shows the save; restore works.
- [ ] Publish/schedule logic: a future "scheduled" post stays hidden until its time.
- [ ] **Delete the TEST post.**

### 4.6 Redirects manager
- [ ] `/studio/redirects` lists redirects; create a TEST redirect, verify it works on the live site, then delete it.

### 4.7 Settings / Team / Templates
- [ ] `/studio/settings` loads and shows real business info — **view only, do not change.**
- [ ] `/studio/team` lists users — **do not modify real users.**
- [ ] `/studio/templates` (reply templates) loads.

### 4.8 Setup / Integrations status
- [ ] `/studio/setup` shows integration health. Confirm these are **green/OK**:
  - Lead email alerts (**Resend**)
  - Website analytics (**PostHog**)
  - Analytics dashboard (**PostHog API**) — if configured
  - Error tracking (**Sentry**) — if configured
  - Media uploads (**Vercel Blob**)
  - **Blog API (programmatic posting)** ← should be OK now that `BLOG_API_TOKEN` is set
  - Google Business Profile, Turnstile, Twilio — note OK/✗ (optional features).

### 4.9 Audit log
- [ ] `/studio/audit` shows recent actions, including your **login**, the **failed login** from 4.1, and the **create/edit/delete** of your test records.

### 4.10 Analytics page
- [ ] `/studio/analytics` renders traffic (PostHog) and unresolved errors (Sentry), or a clean "connect" state if a key is missing.

---

## 5. Integrations — end-to-end

### 5.1 Lead email (Resend) — IMPORTANT, previously unverified
After submitting a test lead (§3.7):
- [ ] The owner inbox (`LEAD_NOTIFICATION_EMAIL` / Site Settings email) receives a **"New lead: …"** email.
- [ ] If a customer email was provided, that address receives a **"We received your request"** auto-reply.
- [ ] In Studio, the lead's detail/activity shows the email was sent (not an `email_error`).
- If **no email arrives**: flag as **High** — check `RESEND_API_KEY` is set and the sending domain is verified in Resend.

### 5.2 Blog API
Run (replace token):
```bash
curl -X POST https://911electrics.com/api/blog/publish \
  -H "Authorization: Bearer <BLOG_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Post — Safe To Delete","markdown":"## It works\n\nA **test** post via the API with a [link](https://911electrics.com/contact/).\n\n- one\n- two","status":"published","categories":["Electrical Tips"]}'
```
- [ ] Returns `201` with `{id, slug, url}`.
- [ ] The returned `url` renders a proper blog post (heading, bold, link, list).
- [ ] `GET https://911electrics.com/api/blog/publish` (same Bearer header) lists posts.
- [ ] No token / wrong token → `401`; missing token configured → `503`.
- [ ] **Cleanup:** delete the "API Test Post" in `/studio/posts`.

---

## 6. Cross-cutting checks
- [ ] **Responsive:** test mobile (~375px), tablet (~768px), desktop (~1440px) on homepage, a service page, a blog post, and the Studio dashboard.
- [ ] **Cross-browser:** at least Chrome + Safari (or Firefox).
- [ ] **Accessibility quick pass:** keyboard-only nav of the header + a form; visible focus rings; images have alt text; run Lighthouse a11y on the homepage.
- [ ] **Performance:** Lighthouse (mobile) on homepage + a service page — note LCP/CLS; flag anything red.
- [ ] **Console:** no uncaught JS errors or blocked-by-CSP resources on public pages.

---

## 7. How to report

For each issue:
- **Severity** — Critical (blocks use / data loss / site down) · High (broken feature, no email, indexing risk) · Medium (visual/UX) · Low (polish).
- **Where** — exact URL + viewport/browser.
- **Steps to reproduce**, **expected**, **actual**.
- **Evidence** — screenshot + relevant console/network output.

### Sign-off criteria
- ✅ All §2 smoke tests pass.
- ✅ No Critical/High open.
- ✅ Lead pipeline verified end-to-end **including email delivery** (§5.1).
- ✅ Public site is indexable (robots `Allow`, canonicals correct, no `noindex`).
- ✅ Studio CRUD works and all TEST records were cleaned up.

---

## Appendix — what changed in this migration (context for the tester)
- WordPress → Next.js (App Router, ISR). Custom **Studio** admin replaced the old CMS.
- New: Service-Areas nav dropdown; brand red `#ee3a3a`; company logo in header/footer/admin; scroll-to-top on logo/active nav.
- About: EVITP / Class "B" GC / C-10 credentials. Hero: call-only CTA.
- Programmatic **service × city** landing pages (~250).
- Page **titles trimmed** to ≤ ~60 chars (services + all 43 cities).
- Security: **enforced CSP** + HSTS and other headers; RLS on internal tables.
- Audit logging across auth + content CRUD; admin **failed-login** widget.
- 301 redirect map from old WP URLs.
- New **Blog API** (`POST /api/blog/publish`) for programmatic posting.
- Integrations: Resend (lead email), PostHog (analytics), Sentry (errors), optional Turnstile/Twilio/Google reviews, Vercel Blob (media).
