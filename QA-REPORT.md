# Full QA Report — 911 Construction & Electric Admin Dashboard

**Date:** 2026-06-11
**System:** Payload CMS admin (Next.js, deployed on Vercel) for a Los Angeles electrician business running programmatic local SEO.
**Tested via:** Live admin UI, the public site, and the Payload REST API for exact data.

**Overall status:** Close to production-ready and well-architected. The structure (globals for identity/shared content, collections for repeatable content, draft/publish + versioning, live preview, SEO plugin, redirects plugin, media library with folders) is genuinely solid. The core lead-capture funnel works end to end, but there is **one critical bug (lead notification email)** and **a systemic SEO issue (meta-title length)** that should be fixed before relying on the site for lead generation.

> **Housekeeping note:** During testing a real test lead was submitted through the live contact form to verify the pipeline. It is stored as **"TEST LEAD - Dashboard QA" (lead ID 4)** — please delete it manually.

---

## Issues Found (by priority)

### 1. Lead notification email appears broken — CRITICAL
The captured test lead record stores `emailSent: false`. The lead saves to the database fine, but the business almost certainly receives **no email alert** when a lead arrives — undermining the site's "respond within 15 minutes" promise. The owner would have to manually watch the admin to see new leads.

**Fix:** Check the email transport config (Resend / SMTP / Nodemailer setup and env vars) and the Leads collection `afterChange` hook. Confirm whether `emailSent` is ever set to `true`.

### 2. Site-wide meta-title overflow — HIGH
Systemic, not isolated. Exact lengths measured via the API (optimal is 50–60 chars):

| Collection | Titles too long | Details |
|---|---|---|
| Services | 6 of 6 | 71–84 chars; plus 1 description over 150 chars (Panel Upgrades, 164) |
| Posts | 12 of 17 | up to 121 chars; 7 of 17 descriptions over 150 chars |
| Cities | 42 of 43 | up to 90 chars; the remaining one is too short (49). Zero cities in optimal range |

Roughly **60 of 66 indexable pages** have meta titles Google will truncate. Root cause: the title template appends the full business name every time — `"{Topic} | Los Angeles, CA | 911 Construction & Electric Inc."`.

**Fix:** Shorten the brand suffix in the SEO field default/hook (e.g., "911 Electric") or drop it on long titles.

### 3. Empty Testimonials → broken "Reviews" navigation — MEDIUM-HIGH
The Testimonials collection is fully built and wired (fields: Author, Location, Rating, Text, Source, Date, Featured = homepage carousel, Cities = city pages it appears on), and Cities have a `featuredTestimonials` relationship field. But the collection is **completely empty** and zero cities reference any testimonial.

Verified consequence on the live site: the homepage has **no `#reviews` section or anchor at all** (`document.getElementById('reviews')` returns `null`), yet both the header nav and footer link to `/#reviews` — so clicking "Reviews" dead-ends site-wide.

**Fix:** Either populate testimonials (the section/carousel will appear), or hide the "Reviews" nav/footer links until reviews are ready.

*Note:* the "5.0 RATING" badges come from the Site Settings **Aggregate Rating** field (value + count) — a separate data source from this collection.

### 4. Cities missing meta/OG images — MEDIUM
All 43 city pages have no `meta.image` set, so social/messaging shares lack a per-page preview image (it may fall back to the Site Settings default OG image, but per-page is better). Services and Posts all have meta images — this gap is specific to Cities.

### 5. Pages collection orphaned — MEDIUM
The Pages collection is empty and unused; the live Privacy Policy renders from a hardcoded route, not from this collection. Either route real static pages (Privacy, Terms, About) through it for editor control, or remove it to avoid confusing non-technical editors.

### 6. Leftover seed/placeholder data — MEDIUM
The Categories collection still contains a Lorem-Ipsum entry literally named **"Maecenas"** from the starter template — delete it. ("Electrical Tips" is legitimate.) Also delete the test lead (ID 4).

### 7. No role-based access control — LOW/MEDIUM
The Users collection has no role/roles field — every user is a full admin. Fine for a single owner, but if staff are added (blog writer, leads-only viewer) there's no way to scope access. Add a `roles` field + access control before going multi-user.

### 8. robots.txt sitemap points to a different domain — LOW (verify)
robots.txt is otherwise correct (allows crawl, disallows `/admin` and `/api`), but its sitemap line points to `https://911electrics.com/sitemap.xml` while the app is currently served from `911electrics.vercel.app`. Confirm the production domain is live; if not, the reference is dangling. Relatedly, set the canonical/base-URL env var so canonicals and OG URLs use the right domain.

### 9. Cosmetic — LOW
The media filename `100-Satishfaction-Gaurantee.svg` has two typos ("Satishfaction" → Satisfaction, "Gaurantee" → Guarantee). Rename.

---

## What Works (verified, no action needed)

- **Dashboard & navigation:** Custom branded "Site Manager" landing panel with quick-action shortcuts; nav logically grouped (Globals, Content, Inbox, Library, System, Site).
- **Services editor (6 entries):** The most polished area — tabbed Hero/Content/SEO layout, working live-preview pane rendering the real page responsively, rich text editor, repeatable array blocks (Features, Benefits, Gallery, FAQs) with drag-to-reorder.
- **Draft/publish workflow & version history:** Field-level diff and restore both fully functional.
- **Cities (43) & Posts (17):** Populated and paginated correctly. The `{{city}}` templating works — Burbank rendered correctly across the H1, every section heading, FAQs, and CTAs (14 interpolations).
- **Structured data:** Excellent Schema.org on city pages — `Electrician`, `FAQPage`, `BreadcrumbList`. Valid sitemap.xml with 74 URLs.
- **Globals:** Homepage and Site Settings are richly structured (Process steps, About, Differentiators, FAQs, business identity, geo coordinates for LocalBusiness schema, socials, aggregate rating, logo, OG image).
- **Media library:** 39 of 41 files have proper thumbnails/resizes; the two without (`Hero-Video.mp4`, the SVG) are expected — video and SVG don't get raster thumbnails. All media has alt text. Earlier blank thumbnails in the list view were lazy-loading artifacts, not missing files.
- **Lead pipeline (end to end):** Live form submits, shows "Request received ✓", lead lands in admin with all fields, a Status workflow field, and rich submission metadata — `sourcePath`, `formLocation`, full `utm` object (source/medium/campaign/term/content), `ip`, `userAgent`. Great attribution data.
- **Spam protection:** Honeypot field `company_website` correctly hidden (`aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`, `position:absolute; opacity:0`) plus a `startedAt` time-trap field. Solid implementation — just confirm the server rejects submissions where the honeypot is filled or `startedAt` is too recent.
- **Misc:** Google Maps embed renders correctly; Leads CRM workflow is solid.

---

## Suggested Fix Order

1. **Lead notification email (#1)** — it's silently losing the business's leads.
2. **Meta-title generation logic (#2)** — systemic SEO truncation across ~60 pages.
3. **Testimonials / broken Reviews links (#3)** — populate or hide.
4. **Data cleanup (#6, #9)** — delete "Maecenas" category, delete test lead ID 4, rename the SVG.
5. **Pages collection decision (#5)** — use it or remove it.
6. **City OG images (#4)**.
7. **Production domain / robots sitemap URL (#8)** — verify and set base-URL env.
8. **RBAC (#7)** — only if multi-user is on the roadmap.
