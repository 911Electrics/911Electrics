# QA Handoff — 911 Construction & Electric (Next.js migration)

End-to-end test plan for the WordPress→Next.js rebuild and all recent work.
Hand this to a testing agent (human or automated). Work top-to-bottom; record
results in the table at the end.

---

## 1. What this is

A Next.js 15 (App Router) site for a Los Angeles electrician, migrated off
WordPress. Content lives in Supabase Postgres and is edited through a custom
admin at `/studio`. Public pages: home, 6 services, 43 city pages, 252
programmatic “service × city” pages, blog, contact, legal. Plus a full lead/CRM
admin (Studio).

**Current production commit:** `cc9dc31` (branch `main`).

## 2. Environments & access

| Thing | Where |
|---|---|
| **App under test (Vercel prod)** | `https://911electrics.vercel.app` |
| Live apex (may still be WordPress until DNS cutover) | `https://911electrics.com` |
| Studio admin | `https://911electrics.vercel.app/studio/login` |
| Repo | `github.com/alwayzlegit/911electrics` |
| Database (LIVE prod) | Supabase project `hywqbbjwepliduwamhip` |

> **Test against the `*.vercel.app` URL**, which always serves the latest
> production build. Don’t judge `911electrics.com` until the apex DNS is pointed
> at Vercel — it may still be the old WordPress site.

**Credentials needed (owner to provide):** a Studio login (email + password, and
a TOTP device if 2FA is enabled on that account).

## 3. Cautions ⚠️

- **Studio writes hit the LIVE production database.** There are real leads and
  real content in there. When testing admin CRUD, create **clearly-labelled test
  records** (e.g. name “QA TEST — delete me”) and **delete them afterward**. Do
  not edit/delete real leads, posts, services, cities, testimonials, or team
  members.
- The lead form (contact + hero) creates real `leads` rows and may fire
  notification emails. Use obvious test data.
- `*.vercel.app` returns `robots: disallow /` **by design** (only the canonical
  apex is indexable) — so “noindex on the preview domain” is **expected, not a
  bug**.

---

## 4. Smoke test (5 minutes — run first)

1. `https://911electrics.vercel.app/` loads, styled, no console errors.
2. Header logo is the 911 logo; nav shows **Services** and **Service Areas**
   dropdowns.
3. Open **Service Areas** dropdown → multi-column list of cities appears.
4. Visit `/ev-charger-installation-burbank-ca/` → a real page titled
   “EV Charger Installation in Burbank, CA” (HTTP 200).
5. Visit `/evitp-certification-ev-charger-incentives-los-angeles/` → ends on
   `/why-evitp-certification-matters-for-ev-charger-incentives-los-angeles/`.
6. `/studio/login` shows the logo and a sign-in form.
7. `/sitemap.xml` and `/robots.txt` return valid XML/text.

If all pass, proceed to the full plan.

---

## 5. Full test plan

### A. 301 Redirects (legacy WordPress → new)
Test each **source** → expect a **301** that lands on **destination** with HTTP
200. (Site uses trailing slashes; both `/x` and `/x/` should work.)

| Source | Expect 301 → | 200? |
|---|---|---|
| `/evitp-certification-ev-charger-incentives-los-angeles/` | `/why-evitp-certification-matters-for-ev-charger-incentives-los-angeles/` | |
| `/residential` | `/services/` | |
| `/our-company` | `/` | |
| `/services/electrical/` | `/services/` | |
| `/services/electrical/residential/` | `/services/` | |
| `/services/electrical/commercial/industrial-electrical-los-angeles-county/` | `/services/` | |
| `/locations.kml` | `/service-areas/` | |
| `/sitemap_index.xml` | `/sitemap.xml` | |
| `/page-sitemap.xml` | `/sitemap.xml` | |
| `/author-sitemap.xml` | `/sitemap.xml` | |
| `/category/uncategorized/` | `/blog/` | |
| `/feed/` | `/blog/` | |
| `/author/anthony_bot/` | `/blog/` | |
| `/wp-admin` | `/studio` (302, temporary) | |

How to check status without a browser:
`curl -sSI https://911electrics.vercel.app/<path>` → look at `HTTP/2 301` +
`location:`. **No redirect chains** (one hop to a 200), **no loops**.

### B. Programmatic service × city pages (252 total)
- Spot-check at least one combo per service:
  `/electrical-panel-upgrades-pasadena-ca/`, `/electrical-repairs-glendale-ca/`,
  `/emergency-electrician-santa-monica-ca/`, `/ev-charger-installation-burbank-ca/`,
  `/lighting-installation-upgrades-sherman-oaks-ca/`,
  `/new-construction-electrical-encino-ca/`.
- Each must: return **200**; H1 = “{Service} in {City}, CA”; show the service’s
  features/benefits/FAQs; have a localized intro mentioning the city; include
  internal links to the parent service page, the city page, and nearby-city
  combos.
- **Unique meta:** page `<title>` and meta description differ per city (no two
  combos share them). View source / check `<title>` and
  `<meta name="description">`.
- **JSON-LD:** view source for `application/ld+json` — should include `Service`,
  `Electrician`, `FAQPage`, `BreadcrumbList`. Validate at
  https://validator.schema.org/.
- **Negative cases (must 404):** `/random-nonsense-zzz/`,
  `/ev-charger-installation-los-angeles-hub/` (LA is excluded from combos).
- **No collision:** `/ev-charger-installation-los-angeles-ca/` is the real LA
  service page (200), not a combo.
- **Sitemap:** `/sitemap.xml` should list all 6 services, 43 cities, 17 posts,
  static pages, and **252 combo URLs**.

### C. Core pages
Each returns 200, is styled, mobile-responsive, has a unique title + meta
description + canonical tag:
- `/` (home), `/services/`, `/service-areas/`, `/contact/`,
  `/privacy-policy/`, `/terms-of-service/`, `/services/los-angeles-ca/`
- All 6 service pages (e.g. `/ev-charger-installation-los-angeles-ca/`)
- A sample of city pages (e.g. `/electrician-burbank-ca/`,
  `/electrician-pasadena-ca/`, `/electrician-santa-monica-ca/`)
- `/blog/`, blog pagination (`/blog/page/2/` if present), several blog posts,
  `/category/electrical-tips/`

### D. Navigation & UX
- **Services dropdown** lists the 6 services; each link works.
- **Service Areas dropdown** lists cities; desktop = scrollable multi-column,
  mobile = contained scroll area (doesn’t bury About/Blog/Contact).
- **Scroll-to-top:** while on `/`, click the logo and the **Home** nav link →
  page smooth-scrolls to top (not a no-op). Repeat on a city page: clicking that
  page’s own link scrolls to top.
- **Mobile menu:** hamburger opens full-screen menu, links work, closes on
  navigation, body doesn’t scroll behind it.
- Footer links (services, service areas, legal, socials) resolve.

### E. Branding
- Primary red is the bright logo red (~`#ee3a3a`) on buttons/CTAs/accents/links
  (not a dark crimson). Hover states darken slightly.
- Company logo appears in: **header**, **footer** (on a white chip over the dark
  footer — legible), **Studio sidebar**, **Studio mobile bar**, **Studio login**.
- Logo isn’t stretched/clipped; alt text present.

### F. Hero & lead forms
- Hero shows a single **“Call 747-255-8595”** button (the “or request a
  callback” link is gone). Phone link dials correctly (`tel:`).
- Hero quote form + `/contact/` form: submit with **test data** →
  success message; a new row appears in **Studio → Quote Requests**. Then
  **delete the test lead**.
- Validation: submit with a bad/empty phone or email → inline error, nothing
  silently dropped.
- Spam guard: an obviously-bot submission (instant submit / spammy content) is
  flagged, not lost.

### G. About section (homepage `#about`)
- “About Us” nav link scrolls to the About section.
- A **Licenses & Certifications** block lists: **EVITP Certified** (with the note
  it’s required for EV charger rebate/incentive programs), **Class “B” General
  Building Contractor**, **C-10 Licensed Electrician**.

### H. Studio admin (use a real login; create/clean test data)
- Login; wrong password is rejected; **login throttle** kicks in after repeated
  failures; **2FA/TOTP** prompt if enabled; password reset / forgot flow.
- Dashboard loads. Sidebar nav respects permissions (non-admin sees fewer items).
- **Quote Requests:** list, search, open a lead, change status, assign owner,
  add a note, CSV export. Pipeline board: drag/stage-change (desktop) + stage
  dropdown (mobile).
- **Blog Posts:** create a draft, edit (rich text), schedule, view revision
  history + restore, publish, then delete the test post.
- **Services / Service Areas / Reviews / Templates:** open and edit a field,
  save, confirm it reflects on the public site (allow up to ~1 hr ISR or trigger
  a redeploy), then revert.
- **Redirects manager:** add a test redirect, see it listed; bulk import box
  accepts `/old/, /new/` lines. (It applies on next deploy.) Remove the test row.
- **Team:** invite flow, roles/permissions, deactivate (use a throwaway).
- **Audit log** records the above actions.
- **Settings / Setup:** business info, integration status screen.
- **Analytics** + **Google Business Profile** sections load.

### I. SEO / technical
- `/sitemap.xml`: valid, absolute URLs, includes all expected pages (see B).
- `/robots.txt`: on the apex it allows crawling and points to the sitemap and
  disallows `/studio`, `/api/`. On `*.vercel.app` it disallows everything
  (expected).
- Every public page has: one `<h1>`, a canonical tag, unique title + meta
  description, OpenGraph/Twitter tags, valid JSON-LD.
- Trailing-slash consistency: canonical URLs end in `/`; non-slash variants
  redirect cleanly.
- 404 page: a bad URL renders the branded 404 (not a server error).

### J. Security
- With only the Supabase **anon key**, the protected tables are **not** readable
  (RLS): `url_redirects`, `leads`, `lead_activity`, `audit_log`,
  `studio_sessions`, `login_throttle`, `post_revisions`, `google_reviews`,
  `google_integration`, `reply_templates`. (Confirm the app still works — it
  uses a privileged server connection, so pages/admin should be unaffected.)
- `/studio` and `/studio/*` require auth; logged-out access redirects to login.
- Security headers present on responses (CSP, X-Content-Type-Options,
  X-Frame-Options, HSTS, Referrer-Policy).
- `/api/` routes aren’t publicly enumerable; cron endpoints require the secret.

### K. Performance & accessibility
- Lighthouse (mobile) on home + a service + a city + a combo page: Performance,
  SEO, Best Practices, Accessibility. Note LCP/CLS. Flag scores < 90.
- Keyboard-only: nav dropdowns open/close, focus visible, menus escapable.
- Images have alt text; color contrast on the new red passes for large/bold
  button text.
- Test on real mobile + desktop widths (320px → 1440px).

---

## 6. Known limitations / non-bugs
- `*.vercel.app` is `noindex` — only the canonical apex gets indexed.
- DB content edits in Studio show on the public site after ISR revalidation
  (~1 hr) or a redeploy, not instantly.
- Redirect rows added in Studio apply on the **next deploy**, not live-instant.
- The apex `911electrics.com` may still serve WordPress until DNS is cut over to
  Vercel — test the `*.vercel.app` URL.

## 7. Results template

| Section | Pass/Fail | Notes |
|---|---|---|
| Smoke test | | |
| A. Redirects | | |
| B. Service×city pages | | |
| C. Core pages | | |
| D. Navigation & UX | | |
| E. Branding | | |
| F. Hero & forms | | |
| G. About/credentials | | |
| H. Studio admin | | |
| I. SEO/technical | | |
| J. Security | | |
| K. Performance/a11y | | |

**Sign-off:** ship-ready when A, B, C, F, I, J pass with no criticals; D/E/G/H/K
issues triaged.
