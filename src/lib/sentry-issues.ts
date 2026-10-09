import 'server-only'

/**
 * Read recent issues from Sentry for the admin Analytics page. Gated on its env
 * and best-effort (returns null on any problem) so the page always renders.
 *
 * Required env (all three) to enable:
 *   SENTRY_AUTH_TOKEN  – a Sentry auth token with project:read / event:read
 *   SENTRY_ORG         – the Sentry org slug
 *   SENTRY_PROJECT     – the Sentry project slug
 *   SENTRY_HOST        – optional, defaults to https://us.sentry.io
 */

export type SentryIssue = {
  id: string
  title: string
  culprit: string | null
  count: number
  userCount: number
  level: string
  permalink: string | null
  lastSeen: string | null
}

export type SentryOverview = { totalEvents: number; issues: SentryIssue[] }

const ORG = process.env.SENTRY_ORG
const PROJECT = process.env.SENTRY_PROJECT
const HOST = (process.env.SENTRY_HOST || 'https://us.sentry.io').replace(/\/$/, '')

export function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_AUTH_TOKEN && ORG && PROJECT)
}

export async function getSentryOverview(): Promise<SentryOverview | null> {
  const token = process.env.SENTRY_AUTH_TOKEN
  if (!token || !ORG || !PROJECT) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  try {
    const url =
      `${HOST}/api/0/projects/${ORG}/${PROJECT}/issues/` +
      `?query=${encodeURIComponent('is:unresolved')}&statsPeriod=14d&limit=8&sort=freq`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{
      id: string
      title?: string
      culprit?: string
      count?: string | number
      userCount?: number
      level?: string
      permalink?: string
      lastSeen?: string
      metadata?: { value?: string }
    }>
    if (!Array.isArray(data)) return null

    const issues: SentryIssue[] = data.map((i) => ({
      id: String(i.id),
      title: String(i.title || i.metadata?.value || 'Error'),
      culprit: i.culprit ?? null,
      count: Number(i.count ?? 0),
      userCount: Number(i.userCount ?? 0),
      level: i.level || 'error',
      permalink: i.permalink ?? null,
      lastSeen: i.lastSeen ?? null,
    }))
    const totalEvents = issues.reduce((sum, i) => sum + i.count, 0)
    return { totalEvents, issues }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
