import 'server-only'

/**
 * Optional website analytics from PostHog, shown on the dashboard. Gated on
 * env and entirely best-effort: any missing config or API hiccup returns null
 * so the dashboard still renders (with a "connect PostHog" prompt).
 *
 * Required env:
 *   POSTHOG_PROJECT_ID   – numeric project id
 *   POSTHOG_API_KEY      – a personal API key with "query:read" scope
 *   POSTHOG_HOST         – optional, defaults to https://us.posthog.com
 */

export type WebAnalytics = {
  pageviews: number
  visitors: number
  topPages: { path: string; views: number }[]
}

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PROJECT_ID && process.env.POSTHOG_API_KEY)
}

async function hogql<T extends unknown[]>(q: string): Promise<T[] | null> {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const apiKey = process.env.POSTHOG_API_KEY
  const host = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, '')
  if (!projectId || !apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: q } }),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { results?: T[] }
    return Array.isArray(data.results) ? data.results : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function getWebAnalytics(): Promise<WebAnalytics | null> {
  if (!isPostHogConfigured()) return null

  const [totals, pages] = await Promise.all([
    hogql<[number, number]>(
      `SELECT count() AS views, count(DISTINCT person_id) AS visitors
       FROM events
       WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY`,
    ),
    hogql<[string, number]>(
      `SELECT properties.$pathname AS path, count() AS views
       FROM events
       WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY
       GROUP BY path ORDER BY views DESC LIMIT 6`,
    ),
  ])

  if (!totals || !totals[0]) return null
  return {
    pageviews: Number(totals[0][0] ?? 0),
    visitors: Number(totals[0][1] ?? 0),
    topPages: (pages ?? [])
      .filter((r) => r[0])
      .map((r) => ({ path: String(r[0]), views: Number(r[1] ?? 0) })),
  }
}

// --- Full analytics for the admin Analytics page ---

export type NamedCount = { label: string; count: number }
export type TrafficDay = { day: string; views: number; visitors: number }

export type SiteAnalytics = {
  days: number
  pageviews: number
  visitors: number
  sessions: number
  trend: TrafficDay[]
  topPages: { path: string; views: number }[]
  referrers: NamedCount[]
  devices: NamedCount[]
  countries: NamedCount[]
  entryPages: { path: string; sessions: number }[]
  rageclicks: number
  deadclicks: number
}

const mapNamed = (rows: [string, number][] | null, fallback = 'Unknown'): NamedCount[] =>
  (rows ?? []).map((r) => ({ label: r[0] ? String(r[0]) : fallback, count: Number(r[1] ?? 0) }))

export async function getSiteAnalytics(days = 30): Promise<SiteAnalytics | null> {
  if (!isPostHogConfigured()) return null
  const since = `now() - INTERVAL ${days} DAY`

  const [totals, trend, pages, referrers, devices, countries, entry, friction] = await Promise.all([
    hogql<[number, number, number]>(
      `SELECT count() AS views, count(DISTINCT person_id) AS visitors,
              count(DISTINCT properties.$session_id) AS sessions
       FROM events WHERE event = '$pageview' AND timestamp > ${since}`,
    ),
    hogql<[string, number, number]>(
      `SELECT toDate(timestamp) AS day, count() AS views, count(DISTINCT person_id) AS visitors
       FROM events WHERE event = '$pageview' AND timestamp > ${since}
       GROUP BY day ORDER BY day`,
    ),
    hogql<[string, number]>(
      `SELECT properties.$pathname AS path, count() AS views
       FROM events WHERE event = '$pageview' AND timestamp > ${since}
       GROUP BY path ORDER BY views DESC LIMIT 8`,
    ),
    hogql<[string, number]>(
      `SELECT properties.$referring_domain AS source, count() AS n
       FROM events WHERE event = '$pageview' AND timestamp > ${since}
       GROUP BY source ORDER BY n DESC LIMIT 6`,
    ),
    hogql<[string, number]>(
      `SELECT properties.$device_type AS device, count(DISTINCT person_id) AS n
       FROM events WHERE event = '$pageview' AND timestamp > ${since}
       GROUP BY device ORDER BY n DESC LIMIT 5`,
    ),
    hogql<[string, number]>(
      `SELECT properties.$geoip_country_name AS country, count(DISTINCT person_id) AS n
       FROM events WHERE event = '$pageview' AND timestamp > ${since}
       GROUP BY country ORDER BY n DESC LIMIT 6`,
    ),
    hogql<[string, number]>(
      `SELECT entry, count() AS sessions FROM (
         SELECT argMin(properties.$pathname, timestamp) AS entry
         FROM events
         WHERE event = '$pageview' AND timestamp > ${since} AND properties.$session_id != ''
         GROUP BY properties.$session_id
       ) GROUP BY entry ORDER BY sessions DESC LIMIT 6`,
    ),
    hogql<[number, number]>(
      `SELECT
         countIf(event = '$rageclick') AS rage,
         countIf(event = '$dead_click') AS dead
       FROM events WHERE event IN ('$rageclick','$dead_click') AND timestamp > ${since}`,
    ),
  ])

  if (!totals || !totals[0]) return null

  return {
    days,
    pageviews: Number(totals[0][0] ?? 0),
    visitors: Number(totals[0][1] ?? 0),
    sessions: Number(totals[0][2] ?? 0),
    trend: (trend ?? []).map((r) => ({
      day: String(r[0]),
      views: Number(r[1] ?? 0),
      visitors: Number(r[2] ?? 0),
    })),
    topPages: (pages ?? []).filter((r) => r[0]).map((r) => ({ path: String(r[0]), views: Number(r[1] ?? 0) })),
    referrers: mapNamed(referrers, 'Direct / none'),
    devices: mapNamed(devices),
    countries: mapNamed(countries),
    entryPages: (entry ?? []).filter((r) => r[0]).map((r) => ({ path: String(r[0]), sessions: Number(r[1] ?? 0) })),
    rageclicks: friction?.[0] ? Number(friction[0][0] ?? 0) : 0,
    deadclicks: friction?.[0] ? Number(friction[0][1] ?? 0) : 0,
  }
}
