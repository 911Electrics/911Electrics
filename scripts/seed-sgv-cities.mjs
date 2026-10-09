#!/usr/bin/env node
/**
 * Seed the 13 San Gabriel Valley expansion city pages (SGV expansion handoff).
 *
 * Each entry creates ONE city row via the maintained content API
 * (POST /api/content/cities), which also writes the neighborhoods + FAQ child
 * rows and fires the cache/sitemap revalidation. The six per-service landing
 * pages for each city (electrical-panel-upgrades-{city}-ca, etc.) are generated
 * automatically by the existing programmatic service×city system once the city
 * row exists and is eligible (slug `electrician-{city}-ca`, no path override),
 * so this script does NOT create those — creating the city is the whole job.
 *
 * Nav, footer, the /service-areas page and the homepage LocalBusiness
 * `areaServed` JSON-LD all derive from the cities table, so they pick these up
 * with no code change.
 *
 * Rich-text fields are plain Markdown; the API converts them to Lexical with
 * the same markdownToLexical() the Studio editor uses. Internal links use
 * absolute https://911electrics.com/... URLs to match existing content.
 *
 * Usage:
 *   BLOG_API_TOKEN=xxxxx node scripts/seed-sgv-cities.mjs           # create against production
 *   SEED_BASE_URL=https://preview... BLOG_API_TOKEN=xxx node scripts/seed-sgv-cities.mjs
 *   node scripts/seed-sgv-cities.mjs --dry-run                      # print payloads, POST nothing
 *
 * Idempotent: a city whose slug already exists returns 409 and is skipped, so
 * re-running only fills in what's missing.
 */

const BASE = (process.env.SEED_BASE_URL || 'https://911electrics.com').replace(/\/$/, '')
const TOKEN = process.env.BLOG_API_TOKEN || process.env.CONTENT_API_TOKEN || ''
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * 13 cities in the handoff's tier order. Copy is deliberately localized per
 * city (housing era, real corridors/landmarks, and the verified permit
 * authority) — not a name-swap — to avoid doorway-page duplication.
 */
const CITIES = [
  // ---- Tier 1 ----
  {
    cityName: 'South Pasadena',
    slug: 'electrician-south-pasadena-ca',
    leadAngle: 'Rewiring',
    metaDescription:
      'Licensed electrician in South Pasadena, CA — rewiring and panel upgrades for Craftsman-era homes, plus repairs, EV chargers and 24/7 service. Call 747-255-8595.',
    intro: `South Pasadena is one of the oldest residential communities in the San Gabriel Valley, and it shows in the wiring. Many homes around the Mission Street district and Monterey Hills date to the 1900s–1920s Craftsman era, and a large share still run on original knob-and-tube or early cloth-insulated wiring that was never designed for today’s loads.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421) specializing in [whole-house rewiring and electrical repairs](https://911electrics.com/electrical-repairs-los-angeles-ca/) for older South Pasadena homes. If your house predates modern wiring, our [rewiring cost guide](https://911electrics.com/whole-house-rewiring-cost-los-angeles/) walks through what to expect before you call.`,
    localNotes: `We work throughout South Pasadena — the Mission Street shopping district, Monterey Hills, Altos de Monterey, and the tree-lined blocks around Garfield Park and Marengo Avenue. Because so much of the housing stock is a century old, rewiring and [panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) are our most-requested jobs here. We pull the electrical permit through the City of South Pasadena Building Division and coordinate inspection for you.`,
    neighborhoods: ['Mission Street District', 'Monterey Hills', 'Altos de Monterey', 'Garfield Park', 'Marengo Avenue', 'Fair Oaks Avenue'],
    faqs: [
      {
        question: 'Do you handle rewiring for older South Pasadena homes?',
        answer: `Yes — rewiring century-old Craftsman and bungalow homes is our specialty in South Pasadena. We replace knob-and-tube and deteriorated cloth wiring, bring circuits up to current code, and pull the permit through the City of South Pasadena Building Division.`,
      },
      {
        question: 'Do I need a permit for electrical work in South Pasadena?',
        answer: `Most rewiring, panel and circuit work requires a permit from the City of South Pasadena Building Division. As a licensed C-10 contractor we pull it for you and coordinate the required inspections.`,
      },
      {
        question: 'How fast can you respond in South Pasadena?',
        answer: `We serve South Pasadena daily and offer [24/7 emergency electrical service](https://911electrics.com/emergency-electrician-los-angeles-ca/) for outages, burning smells and failing panels. Call 747-255-8595.`,
      },
    ],
  },
  {
    cityName: 'San Marino',
    slug: 'electrician-san-marino-ca',
    leadAngle: 'Panel upgrades + EV',
    metaDescription:
      'Licensed electrician in San Marino, CA — panel upgrades and EV charger installation for 1920s–30s estate homes, plus repairs. Call 747-255-8595.',
    intro: `San Marino’s estate homes around the Huntington Library and Lacy Park were largely built in the 1920s and ’30s — gracious houses whose original electrical services often top out at 100 amps or less. That’s a real constraint the moment a homeowner adds a Level 2 EV charger, a pool, or modern HVAC.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421) and an EVITP- and Tesla-certified installer. We handle [200-amp panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) and [EV charger installation](https://911electrics.com/ev-charger-installation-los-angeles-ca/) together for San Marino homes, sized for the whole property rather than one circuit at a time.`,
    localNotes: `We serve all of San Marino — the Huntington Drive corridor, the neighborhoods around Lacy Park and the Huntington Library, and the estate blocks off Mission Street and El Molino. Panel capacity is the theme here: most of our San Marino work is upgrading period-era services to support EV charging and modern loads. Permits are pulled through the City of San Marino Building & Safety Division, and we handle plan check and inspection.`,
    neighborhoods: ['Huntington Drive', 'Lacy Park', 'Huntington Library area', 'Mission Street', 'El Molino Avenue'],
    faqs: [
      {
        question: 'Can my San Marino home’s panel handle an EV charger?',
        answer: `Many San Marino estate homes still have 100-amp (or smaller) services that can’t add a Level 2 charger without an upgrade. We run a load calculation and, where needed, pair a [200-amp panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) with the [EV charger install](https://911electrics.com/ev-charger-installation-los-angeles-ca/) in one project.`,
      },
      {
        question: 'Who issues electrical permits in San Marino?',
        answer: `The City of San Marino Building & Safety Division issues electrical permits and handles plan check. As a licensed contractor we pull the permit and coordinate inspection so you don’t have to.`,
      },
      {
        question: 'Are you licensed and insured to work in San Marino?',
        answer: `Yes — we’re a licensed, bonded and insured C-10 electrical contractor (CA Lic. #1027421), EVITP and Tesla Energy certified, and SCE certified for rebate-eligible work.`,
      },
    ],
  },
  {
    cityName: 'Sierra Madre',
    slug: 'electrician-sierra-madre-ca',
    leadAngle: 'Rewiring / panel safety',
    metaDescription:
      'Licensed electrician in Sierra Madre, CA — rewiring, panel safety upgrades and repairs for older cottages and canyon homes. Call 747-255-8595.',
    intro: `Tucked against the foothills, Sierra Madre is a town of older cottages and canyon-area homes — many with aging services, fuse boxes, or decades-old wiring that predates modern grounding and GFCI requirements. In the wildland-adjacent canyon neighborhoods, an unsafe panel or overloaded circuit isn’t just an inconvenience.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We focus on [electrical repairs, rewiring and panel safety](https://911electrics.com/electrical-repairs-los-angeles-ca/) for Sierra Madre homes — replacing fuse boxes and obsolete panels, correcting overloaded and ungrounded circuits, and making older houses safe.`,
    localNotes: `We cover Sierra Madre from Kersting Court and the Sierra Madre Boulevard village down through the Baldwin Avenue corridor and up into the canyon and foothill blocks near Mater Dolorosa. Older cottages here often need panel replacement and rewiring more than anything else. We pull permits through the City of Sierra Madre Building & Safety Division (Planning & Community Preservation) and handle inspection.`,
    neighborhoods: ['Kersting Court', 'Sierra Madre Boulevard', 'Baldwin Avenue', 'Canyon / foothill neighborhoods', 'Mater Dolorosa area'],
    faqs: [
      {
        question: 'My Sierra Madre home still has a fuse box — should I upgrade?',
        answer: `Almost always, yes. Fuse boxes and undersized panels are common in Sierra Madre’s older cottages and are a safety and insurance concern. We replace them with modern [breaker panels](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) sized for your home.`,
      },
      {
        question: 'Do you pull permits for work in Sierra Madre?',
        answer: `Yes. Panel, rewiring and most circuit work requires a permit from the City of Sierra Madre Building & Safety Division. We handle the permit and inspection as your licensed C-10 contractor.`,
      },
      {
        question: 'Do you offer emergency electrical service in Sierra Madre?',
        answer: `We do — [24/7 emergency service](https://911electrics.com/emergency-electrician-los-angeles-ca/) for outages, sparking panels and burning smells. Call 747-255-8595 any time.`,
      },
    ],
  },
  {
    cityName: 'Alhambra',
    slug: 'electrician-alhambra-ca',
    leadAngle: 'Panel upgrades',
    metaDescription:
      'Licensed electrician in Alhambra, CA — panel upgrades, repairs, EV chargers and 24/7 service for 1920s bungalows and the Main St corridor. Call 747-255-8595.',
    intro: `Alhambra’s residential core is full of 1920s bungalows and mid-century homes, many still on original or long-outdated electrical panels. Between the Main Street corridor’s older commercial buildings and the dense single-family neighborhoods, undersized and obsolete panels are the number-one issue we see in the city.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) across Alhambra — replacing Zinsco, Federal Pacific and other obsolete panels with modern 200-amp services, with the permit and inspection handled for you. See our [panel upgrade cost guide](https://911electrics.com/electrical-panel-upgrade-cost-los-angeles/) for current pricing.`,
    localNotes: `We serve every part of Alhambra — Downtown and the Main Street corridor, the Valley Boulevard and Garfield Avenue business districts, and the residential neighborhoods of Emery Park and Midwick. Older bungalows here frequently need a panel upgrade before they can add AC, EV charging or a remodel. Permits are pulled through the City of Alhambra Building Division.`,
    neighborhoods: ['Downtown / Main Street', 'Valley Boulevard', 'Garfield Avenue', 'Emery Park', 'Midwick'],
    faqs: [
      {
        question: 'How much does a panel upgrade cost in Alhambra?',
        answer: `Most Alhambra panel upgrades to 200 amps fall in a typical range covered in our [panel upgrade cost guide](https://911electrics.com/electrical-panel-upgrade-cost-los-angeles/). The exact price depends on the service size, meter location and any utility coordination. We quote it up front.`,
      },
      {
        question: 'Do I need a permit to replace a panel in Alhambra?',
        answer: `Yes — panel replacement requires a permit from the City of Alhambra Building Division. As a licensed C-10 contractor we pull it and schedule the inspection.`,
      },
      {
        question: 'Do you replace Zinsco and Federal Pacific panels in Alhambra?',
        answer: `Yes. These obsolete panels are common in Alhambra’s older homes and are flagged by many insurers. We replace them with modern, code-compliant panels.`,
      },
    ],
  },
  {
    cityName: 'San Gabriel',
    slug: 'electrician-san-gabriel-ca',
    leadAngle: 'EV chargers',
    metaDescription:
      'Licensed electrician in San Gabriel, CA — EV charger installation, panel upgrades, repairs and 24/7 service across the Mission District. Call 747-255-8595.',
    intro: `San Gabriel mixes historic homes around the Mission District with newer construction along Valley Boulevard and Las Tunas Drive, and EV adoption in the city has run well ahead of its older electrical services. Installing a Level 2 charger here often means checking whether the existing panel can carry the load first.

911 Construction & Electric is an EVITP- and Tesla-certified, licensed C-10 contractor (CA Lic. #1027421). We handle [EV charger installation](https://911electrics.com/ev-charger-installation-los-angeles-ca/) throughout San Gabriel — including the load calculation, any [panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) the charger requires, and available SCE rebates.`,
    localNotes: `We serve San Gabriel from the Mission District and San Gabriel Boulevard to the Valley Boulevard and Las Tunas Drive corridors. EV charger installs and the panel upgrades that go with them are our most-requested jobs in the city. We pull the electrical permit through the City of San Gabriel Building & Safety Division and coordinate inspection.`,
    neighborhoods: ['Mission District', 'Valley Boulevard', 'Las Tunas Drive', 'San Gabriel Boulevard', 'Del Mar Avenue'],
    faqs: [
      {
        question: 'Can you install a Tesla or Level 2 charger in San Gabriel?',
        answer: `Yes — we’re Tesla- and EVITP-certified and install Tesla Wall Connectors and all Level 2 chargers in San Gabriel. If your panel can’t carry the load, we handle the [panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) in the same visit.`,
      },
      {
        question: 'Are EV charger rebates available in San Gabriel?',
        answer: `Southern California Edison serves San Gabriel and offers charger and panel rebates. We’re SCE certified and confirm eligibility and handle the paperwork as part of the [EV charger install](https://911electrics.com/ev-charger-installation-los-angeles-ca/).`,
      },
      {
        question: 'Who issues electrical permits in San Gabriel?',
        answer: `The City of San Gabriel Building & Safety Division. We pull the permit and coordinate inspection for you.`,
      },
    ],
  },
  {
    cityName: 'Monrovia',
    slug: 'electrician-monrovia-ca',
    leadAngle: 'Rewiring',
    metaDescription:
      'Licensed electrician in Monrovia, CA — rewiring and panel upgrades for Old Town’s Victorian and Craftsman homes, plus repairs. Call 747-255-8595.',
    intro: `Monrovia has one of the richest collections of Victorian and Craftsman homes in the San Gabriel Valley, especially in and around Old Town and the Myrtle Avenue corridor. Beautiful houses — and frequently original wiring, ungrounded outlets, and panels that haven’t kept up with a century of added loads.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We specialize in [rewiring and electrical repairs](https://911electrics.com/electrical-repairs-los-angeles-ca/) for Monrovia’s historic homes — replacing knob-and-tube, grounding circuits, and upgrading panels without tearing up the character of the house. Our [rewiring cost guide](https://911electrics.com/whole-house-rewiring-cost-los-angeles/) covers what a full rewire involves.`,
    localNotes: `We work throughout Monrovia — Old Town and the Myrtle Avenue corridor, the north Monrovia foothill neighborhoods, and the blocks around Station Square and Foothill Boulevard. The older the home, the more likely rewiring and a [panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) are the right call. Permits are pulled through the City of Monrovia Building Division.`,
    neighborhoods: ['Old Town Monrovia', 'Myrtle Avenue', 'North Monrovia foothills', 'Foothill Boulevard', 'Station Square'],
    faqs: [
      {
        question: 'Can you rewire a historic Monrovia home without damaging it?',
        answer: `Yes — rewiring older Victorian and Craftsman homes with minimal disruption is exactly what we do in Monrovia. We route new wiring carefully, preserve finishes where possible, and bring everything up to current code.`,
      },
      {
        question: 'Do you pull permits for electrical work in Monrovia?',
        answer: `Yes. Rewiring and panel work require a permit from the City of Monrovia Building Division, which we pull and inspect as your licensed C-10 contractor.`,
      },
      {
        question: 'Do you offer emergency service in Monrovia?',
        answer: `We offer [24/7 emergency electrical service](https://911electrics.com/emergency-electrician-los-angeles-ca/) across Monrovia. Call 747-255-8595 for outages, burning smells or a failing panel.`,
      },
    ],
  },
  // ---- Tier 2 ----
  {
    cityName: 'Temple City',
    slug: 'electrician-temple-city-ca',
    leadAngle: 'Panel upgrades',
    metaDescription:
      'Licensed electrician in Temple City, CA — panel upgrades, repairs, EV chargers and 24/7 service for mid-century homes. Call 747-255-8595.',
    intro: `Temple City’s neighborhoods are largely mid-century tracts built out from the 1940s through the ’60s. Those homes were wired for a very different era — typically 100-amp services that strain under today’s air conditioning, kitchen appliances, and EV charging.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) across Temple City — upgrading mid-century services to 200 amps so the rest of the house can keep up, with permit and inspection handled.`,
    localNotes: `We serve Temple City from the Las Tunas Drive and Rosemead Boulevard corridors to the residential streets off Temple City Boulevard and into the Live Oak area. Mid-century panel upgrades are our bread and butter here. Permits are pulled through the City of Temple City Building & Safety.`,
    neighborhoods: ['Las Tunas Drive', 'Rosemead Boulevard', 'Temple City Boulevard', 'Live Oak Avenue', 'Camellia Square'],
    faqs: [
      {
        question: 'Why do so many Temple City homes need panel upgrades?',
        answer: `Most of Temple City’s housing is mid-century, built with 100-amp (or smaller) services. Adding AC, a remodel or EV charging usually calls for a [200-amp upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/). We run a load calc and quote it up front.`,
      },
      {
        question: 'Who issues electrical permits in Temple City?',
        answer: `The City of Temple City Building & Safety issues electrical permits. As a licensed C-10 contractor we pull the permit and coordinate inspection.`,
      },
      {
        question: 'Are you licensed to work in Temple City?',
        answer: `Yes — licensed, bonded and insured (CA Lic. #1027421), EVITP, Tesla and SCE certified.`,
      },
    ],
  },
  {
    cityName: 'Monterey Park',
    slug: 'electrician-monterey-park-ca',
    leadAngle: 'EV chargers',
    metaDescription:
      'Licensed electrician in Monterey Park, CA. EV charger installation, panel upgrades, repairs and 24/7 service across Atlantic and Garvey. Call 747-255-8595.',
    intro: `Monterey Park’s hillside neighborhoods and mid-century homes weren’t built with electric vehicles in mind, and the city’s steep lots can make charger placement and cable routing tricky. Getting an EV charger installed right here is as much about the panel and the run as the charger itself.

911 Construction & Electric is an EVITP- and Tesla-certified, licensed C-10 contractor (CA Lic. #1027421). We handle [EV charger installation](https://911electrics.com/ev-charger-installation-los-angeles-ca/) throughout Monterey Park — load calculation, any required [panel upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/), clean cable routing on hillside lots, and SCE rebates.`,
    localNotes: `We serve Monterey Park from the Atlantic Boulevard and Garvey Avenue corridors to the Monterey Highlands and the hillside neighborhoods near Monterey Pass. EV charger installs and the panel work behind them are our most-requested jobs in the city. Permits are pulled through the City of Monterey Park Building & Safety at its One-Stop Permit Center.`,
    neighborhoods: ['Atlantic Boulevard', 'Garvey Avenue', 'Monterey Highlands', 'Monterey Pass', 'Garfield Avenue'],
    faqs: [
      {
        question: 'Can you install an EV charger on a Monterey Park hillside home?',
        answer: `Yes — hillside lots are common in Monterey Park and we plan the charger location and cable run for a clean, code-compliant install, upgrading the [panel](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) if the load requires it.`,
      },
      {
        question: 'Are EV rebates available in Monterey Park?',
        answer: `Yes — SCE serves Monterey Park and offers EV charger and panel rebates. We’re SCE certified and handle eligibility and paperwork.`,
      },
      {
        question: 'Who issues electrical permits in Monterey Park?',
        answer: `The City of Monterey Park Building & Safety Division, through its One-Stop Permit Center. We pull the permit and coordinate inspection.`,
      },
    ],
  },
  {
    cityName: 'Duarte',
    slug: 'electrician-duarte-ca',
    leadAngle: 'Panel upgrades',
    metaDescription:
      'Licensed electrician in Duarte, CA. Panel upgrades, repairs, EV chargers and 24/7 service for foothill-tract homes along Huntington Drive. Call 747-255-8595.',
    intro: `Duarte’s foothill tracts — from Royal Oaks to the neighborhoods below the City of Hope — are mostly mid-century homes on original or lightly-updated electrical services. As families add AC, EV charging and modern kitchens, those 100-amp panels run out of room fast.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) throughout Duarte, sized for the whole home and done with the permit and inspection handled for you.`,
    localNotes: `We serve Duarte from the Huntington Drive corridor through Royal Oaks, Mount Olive, and the foothill tracts near the City of Hope. Panel upgrades and [electrical repairs](https://911electrics.com/electrical-repairs-los-angeles-ca/) are our most common Duarte jobs. Building permits are issued through the City of Duarte’s Community Development Department, and we pull the permit and coordinate inspection for you.`,
    neighborhoods: ['Huntington Drive', 'Royal Oaks', 'Mount Olive', 'City of Hope area', 'Fish Canyon'],
    faqs: [
      {
        question: 'Should I upgrade my Duarte home’s panel before adding AC or an EV charger?',
        answer: `Usually yes — most of Duarte’s mid-century homes have 100-amp services that can’t absorb a new AC condenser or Level 2 charger. We run a load calculation and, where needed, upgrade to a [200-amp panel](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/).`,
      },
      {
        question: 'Who issues electrical permits in Duarte?',
        answer: `Building permits in Duarte are issued through the City of Duarte’s Community Development Department. As a licensed C-10 contractor we pull the permit and coordinate inspection.`,
      },
      {
        question: 'Do you offer emergency electrical service in Duarte?',
        answer: `Yes — [24/7 emergency service](https://911electrics.com/emergency-electrician-los-angeles-ca/). Call 747-255-8595 for outages, sparking panels or burning smells.`,
      },
    ],
  },
  {
    cityName: 'Montebello',
    slug: 'electrician-montebello-ca',
    leadAngle: 'Electrical repairs',
    metaDescription:
      'Licensed electrician in Montebello, CA — repairs, troubleshooting, panel upgrades and 24/7 service for homes and multifamily properties. Call 747-255-8595.',
    intro: `Montebello’s housing is a mix — older single-family homes near Whittier and Beverly Boulevards alongside a large share of multifamily buildings. That combination produces a steady stream of the everyday problems we fix best: tripping breakers, dead outlets, failing switches, and aging circuits stretched past their limit.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical repairs and troubleshooting](https://911electrics.com/electrical-repairs-los-angeles-ca/) across Montebello — diagnosing the root cause instead of just resetting the breaker, for both homeowners and property managers.`,
    localNotes: `We serve Montebello from the Whittier Boulevard and Beverly Boulevard corridors to the Montebello Hills and the neighborhoods around the Town Center and Washington Boulevard. Repairs and [panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) on older single-family and multifamily properties are our most-requested work here. Permits are pulled through the City of Montebello Building & Safety Division.`,
    neighborhoods: ['Whittier Boulevard', 'Beverly Boulevard', 'Montebello Hills', 'Montebello Town Center', 'Washington Boulevard'],
    faqs: [
      {
        question: 'My Montebello home’s breaker keeps tripping — can you find the cause?',
        answer: `Yes — a breaker that trips repeatedly is a symptom, not the problem. We trace it to the real cause (an overloaded circuit, a failing breaker, or a fault) and [repair it properly](https://911electrics.com/electrical-repairs-los-angeles-ca/).`,
      },
      {
        question: 'Do you work with Montebello landlords and property managers?',
        answer: `We do — Montebello has a lot of multifamily housing, and we handle repairs, unit turnovers and panel work for property managers, with clear documentation for your files.`,
      },
      {
        question: 'Who issues electrical permits in Montebello?',
        answer: `The City of Montebello Building & Safety Division. We pull the permit and coordinate inspection where the work requires it.`,
      },
    ],
  },
  // ---- Tier 3 ----
  {
    cityName: 'El Monte',
    slug: 'electrician-el-monte-ca',
    leadAngle: 'Panel upgrades',
    metaDescription:
      'Licensed electrician in El Monte, CA. Panel upgrades, repairs, EV chargers and 24/7 service for the city’s high share of pre-1970 homes. Call 747-255-8595.',
    intro: `A large share of El Monte’s housing was built before 1970, and much of it still runs on the original electrical service. Undersized 100-amp (and smaller) panels, ungrounded circuits, and obsolete equipment are common — and they’re the first thing that has to change before a home can add modern AC, a remodel, or EV charging.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) throughout El Monte — replacing old and obsolete panels with modern 200-amp services, permit and inspection included.`,
    localNotes: `We serve El Monte from the Valley Boulevard corridor to the Norwood and Mountain View neighborhoods and along Santa Anita Avenue and Peck Road. With so much pre-1970 housing, panel upgrades and [rewiring](https://911electrics.com/electrical-repairs-los-angeles-ca/) are the core of what we do here. The City of El Monte Building & Safety Division issues the permit, which we pull and inspect for you.`,
    neighborhoods: ['Valley Boulevard', 'Santa Anita Avenue', 'Peck Road', 'Norwood', 'Mountain View'],
    faqs: [
      {
        question: 'Does El Monte Building & Safety handle panel-upgrade permits?',
        answer: `Yes — the City of El Monte Building & Safety Division issues electrical and panel-upgrade permits, and it lists panel service upgrades specifically. We pull the permit and coordinate inspection as your licensed C-10 contractor.`,
      },
      {
        question: 'How do I know if my El Monte home needs a panel upgrade?',
        answer: `Warning signs include a fuse box, a 100-amp (or smaller) panel, frequent tripping, or plans to add AC/EV charging. We’ll assess it and quote a [200-amp upgrade](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) if it’s needed.`,
      },
      {
        question: 'Do you offer 24/7 emergency service in El Monte?',
        answer: `Yes — [24/7 emergency electrical service](https://911electrics.com/emergency-electrician-los-angeles-ca/). Call 747-255-8595.`,
      },
    ],
  },
  {
    cityName: 'Rosemead',
    slug: 'electrician-rosemead-ca',
    leadAngle: 'Electrical repairs',
    metaDescription:
      'Licensed electrician in Rosemead, CA — repairs, troubleshooting, panel upgrades and 24/7 service for older homes. Call 747-255-8595.',
    intro: `Rosemead’s older single-family neighborhoods along Valley Boulevard and Garvey Avenue share a profile with neighboring El Monte: a lot of pre-1970 housing, aging services, and the everyday electrical faults that come with decades of use. Flickering lights, dead outlets and nuisance breaker trips are daily calls here.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical repairs and troubleshooting](https://911electrics.com/electrical-repairs-los-angeles-ca/) throughout Rosemead — finding the real cause and fixing it to code, whether it’s a single circuit or a whole panel.`,
    localNotes: `We serve Rosemead from the Valley Boulevard and Garvey Avenue corridors to the Rosemead Boulevard and Savannah neighborhoods. Repairs and [panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) on older homes are our most-requested work. Permits are pulled through the City of Rosemead Building & Safety Division, which follows the Los Angeles County code set; we handle the permit and inspection.`,
    neighborhoods: ['Valley Boulevard', 'Garvey Avenue', 'Rosemead Boulevard', 'Savannah', 'Rosemead Place'],
    faqs: [
      {
        question: 'Can you fix flickering lights and dead outlets in my Rosemead home?',
        answer: `Yes — those are classic symptoms of loose connections, an overloaded circuit or a failing panel. We [diagnose and repair](https://911electrics.com/electrical-repairs-los-angeles-ca/) the root cause rather than treating the symptom.`,
      },
      {
        question: 'Who issues electrical permits in Rosemead?',
        answer: `The City of Rosemead Building & Safety Division, which follows the Los Angeles County code set. As a licensed C-10 contractor we pull the permit and coordinate inspection.`,
      },
      {
        question: 'Are you available for emergencies in Rosemead?',
        answer: `Yes — [24/7 emergency electrical service](https://911electrics.com/emergency-electrician-los-angeles-ca/). Call 747-255-8595 any time.`,
      },
    ],
  },
  {
    cityName: 'Baldwin Park',
    slug: 'electrician-baldwin-park-ca',
    leadAngle: 'Electrical repairs',
    metaDescription:
      'Licensed electrician in Baldwin Park, CA — repairs, troubleshooting, panel upgrades and 24/7 service for older homes. Call 747-255-8595.',
    intro: `Baldwin Park’s established neighborhoods around Ramona Boulevard and Maine Avenue are full of older single-family homes on aging electrical systems. The result is a steady need for honest repair work — tracing nuisance trips, replacing failing outlets and switches, and correcting circuits that were overloaded years ago.

911 Construction & Electric is a licensed, bonded and insured electrical contractor (CA Lic. #1027421). We handle [electrical repairs and troubleshooting](https://911electrics.com/electrical-repairs-los-angeles-ca/) across Baldwin Park — and, when a home has outgrown its service, [panel upgrades](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/) to match.`,
    localNotes: `We serve Baldwin Park from downtown and the Ramona Boulevard corridor to Maine Avenue, Morgan Park and the Francisquito Avenue neighborhoods. Repairs and panel work on older homes are our most-requested jobs. Permits are pulled through the City of Baldwin Park Building & Safety Division, and we handle inspection.`,
    neighborhoods: ['Downtown Baldwin Park', 'Ramona Boulevard', 'Maine Avenue', 'Morgan Park', 'Francisquito Avenue'],
    faqs: [
      {
        question: 'Do you handle small electrical repairs in Baldwin Park?',
        answer: `Yes — no job is too small. Dead outlets, failing switches, tripping breakers and flickering lights are everyday work for us in Baldwin Park, and we fix the underlying cause to code.`,
      },
      {
        question: 'Who issues electrical permits in Baldwin Park?',
        answer: `The City of Baldwin Park Building & Safety Division. We pull the permit and coordinate inspection when the work requires it.`,
      },
      {
        question: 'Do you offer emergency service in Baldwin Park?',
        answer: `Yes — [24/7 emergency electrical service](https://911electrics.com/emergency-electrician-los-angeles-ca/). Call 747-255-8595.`,
      },
    ],
  },
]

export { CITIES, payloadFor }

function payloadFor(c) {
  // region is intentionally omitted (null) to match existing city rows, which
  // carry no region value. meta_title mirrors the existing convention
  // "Electrician in {City}, CA | 911 Electric" (all ≤ 60 chars here).
  return {
    cityName: c.cityName,
    slug: c.slug,
    title: `Electrician in ${c.cityName}, CA`,
    metaTitle: `Electrician in ${c.cityName}, CA | 911 Electric`,
    status: 'published',
    metaDescription: c.metaDescription,
    introOverride: c.intro,
    localNotes: c.localNotes,
    neighborhoods: c.neighborhoods,
    faqs: c.faqs,
  }
}

async function main() {
  if (CITIES.length !== 13) throw new Error(`Expected 13 cities, have ${CITIES.length}`)

  // Guard against slug typos / duplicates before touching the network.
  const slugs = new Set()
  for (const c of CITIES) {
    if (!/^electrician-[a-z-]+-ca$/.test(c.slug)) throw new Error(`Bad slug: ${c.slug}`)
    if (slugs.has(c.slug)) throw new Error(`Duplicate slug: ${c.slug}`)
    slugs.add(c.slug)
  }

  if (DRY_RUN) {
    for (const c of CITIES) {
      console.log(`\n=== ${c.cityName} (${c.slug}) ===`)
      console.log(JSON.stringify(payloadFor(c), null, 2))
    }
    console.log(`\nDry run: ${CITIES.length} cities. POST nothing.`)
    return
  }

  if (!TOKEN) {
    console.error('Set BLOG_API_TOKEN (or CONTENT_API_TOKEN) in the environment.')
    process.exit(1)
  }

  const results = { created: [], skipped: [], failed: [] }
  for (const c of CITIES) {
    const res = await fetch(`${BASE}/api/content/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(payloadFor(c)),
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 201) {
      console.log(`✓ created ${c.slug} → ${body.url ?? ''}`)
      results.created.push(c.slug)
    } else if (res.status === 409) {
      console.log(`• skip ${c.slug} (already exists)`)
      results.skipped.push(c.slug)
    } else {
      console.error(`✗ FAILED ${c.slug} → HTTP ${res.status}`, JSON.stringify(body))
      results.failed.push(c.slug)
    }
  }

  console.log(
    `\nDone. created=${results.created.length} skipped=${results.skipped.length} failed=${results.failed.length}`,
  )
  if (results.failed.length) process.exit(1)
}

// Only run when invoked directly (so the data can be imported for validation).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
