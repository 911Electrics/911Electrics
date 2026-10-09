import { getServerSideURL } from '@/utilities/getURL'

/**
 * /llms.txt — a concise, link-rich summary for AI assistants and LLM-based
 * search (the llms.txt convention). Mirrors the most important pages so models
 * can ground answers about the business in the canonical site.
 */
export const dynamic = 'force-static'

export function GET(): Response {
  const base = getServerSideURL().replace(/\/$/, '')

  const body = `# 911 Construction & Electric Inc.

> Licensed, bonded, and insured electrical contractor (CA Lic. #1027421) serving Los Angeles and surrounding Southern California. 24/7 emergency electricians for repairs, panel upgrades, EV charger installation, lighting, and new construction. Phone: 747-255-8595.

## Services
- [Electrical Repairs & Troubleshooting](${base}/electrical-repairs-los-angeles-ca/)
- [Electrical Panel Upgrades](${base}/electrical-panel-upgrades-los-angeles-ca/)
- [EV Charger Installation](${base}/ev-charger-installation-los-angeles-ca/)
- [New Construction Electrical](${base}/new-construction-electrical-los-angeles-ca/)
- [Lighting Installation & Upgrades](${base}/lighting-installation-upgrades-los-angeles-ca/)
- [Emergency Electrical Services (24/7)](${base}/emergency-electrician-los-angeles-ca/)

## Company
- [Contact & Free Quote](${base}/contact/)
- [Service Areas](${base}/service-areas/)
- [Blog](${base}/blog/)

## Optional
- [Sitemap](${base}/sitemap.xml)
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
