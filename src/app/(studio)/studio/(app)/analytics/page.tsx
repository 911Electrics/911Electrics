import { query } from '@/db/client'
import { getSiteAnalytics, isPostHogConfigured, type NamedCount } from '@/lib/posthog'
import { getSentryOverview, sentryConfigured } from '@/lib/sentry-issues'
import { timeAgo } from '@/studio/constants'

import { Card, Kpi, TrendBars } from '../dashboard-ui'

export const dynamic = 'force-dynamic'

function BarList({ items, empty }: { items: NamedCount[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty ?? 'No data yet.'}</p>
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div className="flex items-center gap-3" key={i.label}>
          <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-600" title={i.label}>
            {i.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-400" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-slate-500">{i.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

const LEVEL_BADGE: Record<string, string> = {
  fatal: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-700',
}

export default async function AnalyticsPage() {
  const [analytics, sentry] = await Promise.all([getSiteAnalytics(30), getSentryOverview()])

  let conversion: number | null = null
  if (analytics && analytics.visitors > 0) {
    const [r] = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM leads WHERE status <> 'spam' AND created_at > now() - interval '30 days'`,
    )
    conversion = Number(r?.n ?? 0) / analytics.visitors
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Traffic, journeys and errors across the website. {analytics ? 'Last 30 days.' : ''}
        </p>
      </header>

      {/* --- Traffic (PostHog) --- */}
      {analytics ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Visitors" value={analytics.visitors.toLocaleString()} />
            <Kpi label="Page views" value={analytics.pageviews.toLocaleString()} />
            <Kpi label="Sessions" value={analytics.sessions.toLocaleString()} />
            <Kpi
              label="Visitor → lead"
              sub="leads ÷ visitors (30d)"
              value={conversion != null ? `${(conversion * 100).toFixed(1)}%` : '—'}
            />
          </section>

          <Card title="Traffic — last 30 days">
            <TrendBars data={analytics.trend.map((d) => ({ day: d.day, count: d.views }))} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Top pages">
              <BarList items={analytics.topPages.map((p) => ({ label: p.path, count: p.views }))} />
            </Card>
            <Card title="Entry pages (where journeys start)">
              <BarList items={analytics.entryPages.map((p) => ({ label: p.path, count: p.sessions }))} />
            </Card>
            <Card title="Where visitors come from">
              <BarList empty="No referrers yet." items={analytics.referrers} />
            </Card>
            <Card title="Countries">
              <BarList items={analytics.countries} />
            </Card>
            <Card title="Devices">
              <BarList items={analytics.devices} />
            </Card>
            <Card title="On-page friction">
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Rage clicks" value={analytics.rageclicks.toLocaleString()} />
                <Kpi label="Dead clicks" value={analytics.deadclicks.toLocaleString()} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                High counts flag confusing or broken UI worth fixing.
              </p>
            </Card>
          </div>
        </>
      ) : (
        <Card title="Website analytics (PostHog)">
          <p className="text-sm text-slate-500">
            {isPostHogConfigured()
              ? 'Couldn’t load analytics — check the PostHog API key and project id.'
              : 'Not connected yet. Add the PostHog browser key to start collecting visits and journeys, and the server query keys to show them here.'}
          </p>
          {!isPostHogConfigured() && (
            <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-slate-500">
              <li><code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_POSTHOG_KEY</code> — site capture</li>
              <li><code className="rounded bg-slate-100 px-1">POSTHOG_PROJECT_ID</code> + <code className="rounded bg-slate-100 px-1">POSTHOG_API_KEY</code> — read here</li>
            </ul>
          )}
        </Card>
      )}

      {/* --- Errors (Sentry) --- */}
      <Card
        action={sentry && <span className="text-xs text-slate-400">unresolved · 14 days</span>}
        title="Errors (Sentry)"
      >
        {sentry ? (
          sentry.issues.length === 0 ? (
            <p className="text-sm text-green-700">No unresolved errors in the last 14 days. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sentry.issues.map((i) => (
                <li className="flex items-start justify-between gap-3 py-2.5" key={i.id}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_BADGE[i.level] ?? 'bg-slate-100 text-slate-600'}`}>
                        {i.level}
                      </span>
                      {i.permalink ? (
                        <a className="truncate text-sm font-medium text-slate-800 hover:text-brand-600" href={i.permalink} rel="noopener noreferrer" target="_blank">
                          {i.title}
                        </a>
                      ) : (
                        <span className="truncate text-sm font-medium text-slate-800">{i.title}</span>
                      )}
                    </div>
                    {i.culprit && <p className="truncate text-xs text-slate-400">{i.culprit}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <div>{i.count.toLocaleString()} events</div>
                    <div className="text-slate-400">
                      {i.userCount} users{i.lastSeen ? ` · ${timeAgo(i.lastSeen)}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-500">
            {sentryConfigured()
              ? 'Couldn’t load Sentry issues — check the auth token, org and project.'
              : 'Not connected. Add a SENTRY_AUTH_TOKEN (project & event read scope) to surface unresolved errors here.'}
          </p>
        )}
      </Card>
    </div>
  )
}
