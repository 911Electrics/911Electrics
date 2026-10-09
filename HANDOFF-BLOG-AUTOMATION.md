# Blog Automation Handoff — utilities & internal linking

This is the brief for whatever writes the scheduled blog posts (the AI writer /
automation that `POST`s to the blog API). Two things must be right on every
post: **which utility serves the city**, and **internal links to our service
pages**. Paste the rules below into the writer's system prompt / content brief.

---

## 1. How posts reach the site

Posts are created by `POST`ing to **`/api/blog/publish`** with a bearer token.
You send Markdown (or raw Lexical); the API converts it, stores it, and (for
`status: "published"`) makes it live immediately. `status: "draft"` with a
`scheduled_for`-style flow is published later by the cron worker
(`/api/cron/tick`, run on a Vercel schedule).

- **Auth:** `Authorization: Bearer <key>`. Use a key created in **Studio → API
  keys** with the "Blog writer" preset (`posts:*`, `media:write`) — it can
  publish and edit posts and nothing else, shows up by name in the audit log,
  and can be revoked instantly. The original `BLOG_API_TOKEN` still works. Do
  not paste either into posts or commits.
- **Canonical URL:** `/api/admin/v1/posts` (and `/api/admin/v1/posts/{id}`).
  `/api/blog/publish` and `/api/blog/posts/{id}` are aliases of those and keep
  working. `GET /api/admin/v1` describes the whole API and what your key may do.
- **List recent posts** to avoid duplicate slugs/topics: `GET /api/blog/publish`.
- After publish the API revalidates `/blog`, the new post, and the sitemap
  automatically — no extra cache step needed for API-created posts.

Minimal body:

```json
{
  "title": "Why a Panel Upgrade Pays Off in Pasadena",
  "markdown": "## Intro\n\nFull post body in Markdown …",
  "excerpt": "One-sentence summary for cards and meta description.",
  "categories": ["Panel Upgrades"],
  "heroImageUrl": "https://…/hero.jpg",
  "heroImageAlt": "200-amp electrical panel installed in a Pasadena home",
  "status": "published"
}
```

---

## 2. Utility per city — get this right

Getting the utility wrong undercuts trust with local readers immediately, and
it is easy to get wrong here: **four different municipal utilities** operate
inside our service area, and the largest of them is the City of Los Angeles
itself.

The rule is about the **jurisdiction**, not the place name. Ask first: is this
service area inside the City of Los Angeles?

| Utility | Serves | Notes |
|---|---|---|
| **LADWP** (Los Angeles Dept. of Water & Power) | Neighborhoods **inside the City of Los Angeles** — most of our San Fernando Valley and Northeast LA service areas | Municipal. This is the one the old version of this table got wrong. |
| **PWP** (Pasadena Water & Power) | **Pasadena** | Municipal. Rebates: up to **$1,000** panel upgrade, up to **$600** home EV charger. Say "up to" and "confirm current terms with PWP". |
| **GWP** (Glendale Water & Power) | **Glendale** | Municipal. Has its own rebate programs — never cite SCE amounts for Glendale. |
| **BWP** (Burbank Water & Power) | **Burbank** | Municipal. Own programs; don't quote a number, say "check BWP's current rebates". |
| **SCE** (Southern California Edison) | The **independent cities** we serve and the **unincorporated county** areas | Santa Monica, Beverly Hills, Calabasas, Arcadia, Alhambra, San Marino, Sierra Madre, South Pasadena, Temple City, San Gabriel, Monrovia, Rosemead, Montebello, Monterey Park, Baldwin Park, Duarte, El Monte, La Cañada Flintridge, Long Beach, Thousand Oaks, Oxnard, and unincorporated **Altadena** and **La Crescenta**. |

### Which of our service areas are City of Los Angeles (→ LADWP)

Arleta · Canoga Park · Chatsworth · Eagle Rock · Encino · Granada Hills ·
Hancock Park · Highland Park · Hollywood · Los Feliz · Melrose · Mission Hills ·
North Hills · North Hollywood · Northridge · Porter Ranch · Reseda ·
Sherman Oaks · Studio City · Sun Valley · Sunland · Sylmar · Tarzana ·
Toluca Lake · Tujunga · Van Nuys · West Hills · Woodland Hills

### Three traps

1. **"San Fernando" is not the City of Los Angeles.** The City of San Fernando
   is its own incorporated municipality surrounded by LA, so it is *not* on
   LADWP. Verify before naming a utility in a San Fernando post rather than
   assuming either way. (The *San Fernando Valley* as a region is mostly City
   of LA, and mostly LADWP — the two are easy to conflate.)
2. **LADWP's territory has SCE pockets.** LADWP's own service maps mark areas
   inside the Valley as "Served by SCE". For a neighborhood post, "most of
   {neighborhood} is served by LADWP" is safer and still specific; save the
   absolute phrasing for Pasadena, Glendale and Burbank, where the municipal
   boundary is the city boundary.
3. **Montrose is inside the City of Glendale; La Crescenta is not.** They are
   usually named together as "La Crescenta-Montrose", but Montrose sits within
   Glendale city limits (GWP) while La Crescenta is unincorporated county
   (SCE). If a post covers both, don't give them one utility.

**Rules for the writer:**

- Decide the jurisdiction first, then the utility. Pasadena → PWP,
  Glendale → GWP, Burbank → BWP, City of LA neighborhood → LADWP, otherwise
  → SCE.
- It's fine — and good for search — to mention SCE as a *contrast* in a
  municipal-utility post ("unlike SCE customers, Pasadena homeowners go through
  PWP…"). That targets real queries like *"PWP vs SCE Pasadena"*.
- Only PWP's rebate figures are quoted in this doc. For LADWP, GWP and BWP, say
  "check the utility's current rebate program" rather than inventing a number.
- High-value, low-competition keywords to work in naturally where relevant:
  *Pasadena Water and Power panel upgrade*, *PWP panel upgrade rebate*, *PWP EV
  charger rebate*, *PWP vs SCE Pasadena*, *Glendale Water and Power panel
  upgrade*, *LADWP panel upgrade*, *LADWP EV charger rebate*,
  *SCE Charge Ready Home eligibility*.

### Permit authority, while you're at it

The same jurisdiction question answers who issues the permit, and naming it is
one of the most useful city-specific details a post can carry:

- City of LA neighborhood → **LADBS** (LA Dept. of Building & Safety)
- Unincorporated county (Altadena, La Crescenta) → **LA County Public Works,
  Building & Safety**
- Any independent city → **that city's own building division** (e.g. "the City
  of Arcadia Building Services Division")

---

## 3. Internal links to service and city pages

Linking topic mentions to the matching service page is one of the strongest
on-page SEO signals we have. **The blog API now does a baseline pass of this
automatically** (`src/lib/auto-link-services.ts`): on every publish it links the
**first** mention of each core topic to its service page — at most one link per
service and 4 per post, never inside an existing link or a heading.

That safety net means posts are never link-less, but the automatic pass is
deliberately minimal. **Writers should still add their own contextual links**
in Markdown where it reads naturally — especially the anchor text a human would
click ("upgrade your panel", "install an EV charger"). Author links win; the
auto-linker only fills first-mention gaps it finds.

**Canonical service URLs (use these exact paths):**

| Topic / anchor phrases | Link to |
|------------------------|---------|
| panel upgrade, electrical panel upgrade, 200-amp panel/service, service upgrade | `https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/` |
| EV charger, EV charger installation, Level 2 charger, NEMA 14-50, Tesla Wall Connector | `https://911electrics.com/ev-charger-installation-los-angeles-ca/` |
| rewiring, knob-and-tube, aluminum wiring, electrical repair, troubleshooting | `https://911electrics.com/electrical-repairs-los-angeles-ca/` |
| lighting installation, recessed lighting, landscape lighting | `https://911electrics.com/lighting-installation-upgrades-los-angeles-ca/` |
| new construction, ADU wiring | `https://911electrics.com/new-construction-electrical-los-angeles-ca/` |
| emergency electrician, 24/7, power outage | `https://911electrics.com/emergency-electrician-los-angeles-ca/` |

Markdown link syntax (converted to real links server-side):

```markdown
A [panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/)
is usually required before an
[EV charger installation](https://911electrics.com/ev-charger-installation-los-angeles-ca/)
in an older Pasadena home.
```

Guidelines:

- Link the **first natural mention** of a topic, not every mention.
- 2–5 internal links per post is plenty. Don't stuff.
- Link the descriptive phrase, not "click here".
- For a **city** post, link the city's own page, e.g.
  `https://911electrics.com/electrician-pasadena-ca/`. Prefer a descriptive
  anchor — "electrician in Pasadena" beats a bare "Pasadena".

### City pages are linked automatically too

City-targeted posts are the site's best organic performers, and for a long time
none of them linked to the city page they were about. The API now runs a second
pass (`src/lib/auto-link-cities.ts`) after the service pass:

- The city named in the post **title** is linked first, on its first mention in
  the body, to `/electrician-{city}-ca/`. Remaining slots go to other served
  cities in the order they appear — **at most 2 city links per post**.
- If the mention already reads "electrician in Glendale" or "Glendale
  electricians", the whole phrase becomes the anchor.
- It will **not** link a name that is really something else: "South Pasadena"
  is not Pasadena, "West Hollywood" and "Hollywood Hills" are not Hollywood, and
  "Glendale Avenue", "Pasadena Water and Power" or "Burbank Airport" are not the
  city. Los Angeles is never auto-linked (it is named in every post).
- Same rules as the service pass: never inside an existing link or heading, and
  **a page you already linked by hand is left alone**.

So put the city in the title of a city post, and mention it in a body paragraph
— not only in headings, which are skipped.

### Don't write a second city page

Every service area already has a page titled **"Electrician in {City}, CA"** at
`/electrician-{city}-ca/` — that page is what should rank for "electrician
{city}". As of September 2026, 17 published posts carry almost the same title
("Electrician in Pasadena, CA: Panel Upgrades & Rewiring"), so Google has two
of our pages to choose between for one query and splits the signals between
them.

For a city post, **lead the title with the topic, not with "Electrician in"**:

| Instead of | Write |
|------------|-------|
| Electrician in Glendale, CA: Panels, EV Chargers & More | Glendale Panel Upgrades: What GWP Customers Should Know |
| Electrician in Monrovia, CA: Rewiring Older Homes | Rewiring a 1920s Monrovia Bungalow: Cost, Permits, Timeline |

A post answers one specific question for that city (a rebate, a permit, a cost,
a housing-era problem) and hands the reader to the city page for everything
else. Existing posts keep their titles and URLs — they rank, and changing them
is the owner's decision, not the writer's.

### Updating and backfilling

`PATCH /api/blog/posts/{id}` runs both passes whenever it receives a new
`markdown` or `content` body. To add the links to a post **without touching its
text**, send `{"relink": true}`: the stored body is re-linked in place and the
response reports `linksAdded`. It is idempotent — a post with nothing to add
comes back `"unchanged": true` and is not modified. Add `"dryRun": true` to see
`linksAdded` without writing anything. `scripts/backfill-post-links.mjs` does
this across the whole archive (dry-run unless `--apply`).

`GET /api/blog/publish?limit=200&offset=0` pages through the whole archive
(default 50, max 200).

---

## 4. Worked example (Pasadena, published post #7)

The Pasadena panel-upgrade rebate post now ends with this section — it is the
pattern to copy for utility accuracy + internal links:

```markdown
## Pasadena Water & Power (PWP) Rebates

Pasadena runs on its own municipal utility, Pasadena Water & Power (PWP) — not
Southern California Edison — so its rebate programs and amounts differ from
SCE's. Pasadena homeowners can currently qualify for up to **$1,000 toward an
[electrical panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/)**
and up to **$600 toward a home
[EV charger installation](https://911electrics.com/ev-charger-installation-los-angeles-ca/)**
through PWP. Amounts and eligibility change, so confirm the current terms on
PWP's website before you apply …
```

---

## 5. Quick checklist per post

- [ ] Jurisdiction identified first, then the utility
      (LADWP / PWP / GWP / BWP / SCE — see §2).
- [ ] No SCE rebate figures attributed to an LADWP/PWP/GWP/BWP area, and no
      invented figures for LADWP, GWP or BWP.
- [ ] Permit authority named correctly (LADBS / LA County Public Works / the
      city's own building division).
- [ ] 2–5 internal links to the service pages above, first-mention, natural anchors.
- [ ] City post: the city is in the title and in a body paragraph (so it gets
      auto-linked), and the title does **not** start "Electrician in {City}, CA".
- [ ] Unique title + slug (check `GET /api/blog/publish`).
- [ ] `excerpt` set (drives the card + meta description).
- [ ] Hero image with descriptive `heroImageAlt`. `heroImageUrl` must be a public
      **https** URL to a JPG, PNG, WebP, AVIF or GIF under 8 MB — no SVG, no
      http, no non-standard ports. The type is read from the file itself, so the
      URL's extension does not matter; a page that merely *shows* the image does.
