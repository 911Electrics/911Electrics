import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getWebAnalytics, isPostHogConfigured } from '@/lib/posthog'
import { can, getStudioUser } from '@/studio/auth'
import { timeAgo, type LeadStatus } from '@/studio/constants'
import {
  getContentCounts,
  getFailedLogins,
  getLeadMetrics,
  getRecentActivity,
  getTodoLeads,
  type TodoLead,
} from '@/studio/dashboard'
import { getIntegrationStatuses } from '@/studio/integration-status'

import {
  Card,
  Delta,
  formatMins,
  Funnel,
  Kpi,
  money,
  SourceBars,
  statusBadge,
  TrendBars,
} from './dashboard-ui'

export const dynamic = 'force-dynamic'

function todoLabel(t: TodoLead): { text: string; tone: string } {
  if (t.nextFollowUpAt) {
    const due = new Date(t.nextFollowUpAt).getTime()
    if (due < Date.now()) return { text: `Follow-up overdue · ${timeAgo(t.nextFollowUpAt)}`, tone: 'text-red-600' }
    return { text: 'Follow-up due today', tone: 'text-amber-600' }
  }
  return { text: `New · ${timeAgo(t.createdAt)}`, tone: 'text-brand-600' }
}

export default async function StudioDashboard() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')

  const showLeads = can(me, 'leads')
  const showContent = can(me, 'content') || can(me, 'reviews')
  const isAdmin = me.role === 'admin'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const [metrics, todos, activity, content, web, failedLogins, integrations] = await Promise.all([
    showLeads ? getLeadMetrics() : null,
    showLeads ? getTodoLeads() : null,
    showLeads ? getRecentActivity(8) : null,
    showContent ? getContentCounts() : null,
    isAdmin ? getWebAnalytics() : null,
    isAdmin ? getFailedLogins(5) : null,
    isAdmin ? getIntegrationStatuses() : null,
  ])

  // Only nag about integrations that look *broken*, not ones that simply
  // haven't been set up yet — a key being present but the integration still
  // failing (e.g. Resend's sending domain unverified) is the failure mode
  // that hides silently, so that's what belongs on the page people actually
  // look at daily instead of only on Setup.
  const brokenIntegrations =
    integrations?.filter((i) => !i.ok && i.envVars.some((v) => Boolean(process.env[v]))) ?? []

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}{me.name ? `, ${me.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening with 911 Construction &amp; Electric.
        </p>
      </header>

      {brokenIntegrations.length > 0 && (
        <Link
          className="block rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm hover:bg-red-100"
          href="/studio/setup"
        >
          <strong className="text-red-700">
            {brokenIntegrations.length} integration{brokenIntegrations.length === 1 ? '' : 's'} configured but not working
          </strong>
          <span className="block text-red-700/80">
            {brokenIntegrations.map((i) => i.name).join(' · ')} — open Setup for details →
          </span>
        </Link>
      )}

      {metrics && (
        <>
          {metrics.newLeads > 0 && (
            <Link
              className="block rounded-xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3 text-sm hover:bg-brand-100"
              href="/studio/leads?status=new"
            >
              <strong className="text-brand-700">
                {metrics.newLeads} new quote {metrics.newLeads === 1 ? 'request' : 'requests'}
              </strong>{' '}
              waiting for a callback →
            </Link>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              accent={metrics.newLeads > 0}
              href="/studio/leads?status=new"
              label="New requests"
              value={metrics.newLeads}
            />
            <Kpi
              href="/studio/leads"
              label="Leads this week"
              sub={<Delta current={metrics.weekLeads} previous={metrics.prevWeekLeads} />}
              value={metrics.weekLeads}
            />
            <Kpi
              label="Avg. response time"
              sub={
                metrics.respondedShare != null
                  ? `${Math.round(metrics.respondedShare * 100)}% responded (30d)`
                  : 'last 30 days'
              }
              value={formatMins(metrics.avgFirstResponseMins)}
            />
            <Kpi
              label="Win rate"
              sub={`${metrics.wonCount} won · ${metrics.lostCount} lost`}
              value={metrics.conversionRate != null ? `${Math.round(metrics.conversionRate * 100)}%` : '—'}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Leads — last 14 days">
              <TrendBars data={metrics.leadsByDay} />
            </Card>
            <Card
              action={
                <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" href="/studio/pipeline">
                  Open board
                </Link>
              }
              title="Pipeline"
            >
              <Funnel stages={metrics.pipelineByStage} />
            </Card>
          </div>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Kpi href="/studio/pipeline" label="Open pipeline value" value={money(metrics.openValue)} />
            <Kpi label="Won this month" value={money(metrics.wonValueMonth)} />
            <Kpi
              label="Avg. job value"
              value={metrics.avgJobValue != null ? money(metrics.avgJobValue) : '—'}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {todos && (
              <Card
                action={
                  <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" href="/studio/leads">
                    All leads
                  </Link>
                }
                title="Needs attention"
              >
                {todos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">You&apos;re all caught up 🎉</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {todos.map((t) => {
                      const { text, tone } = todoLabel(t)
                      return (
                        <li key={t.id}>
                          <Link className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50" href={`/studio/leads/${t.id}`}>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-800">{t.name}</span>
                              <span className={`text-xs ${tone}`}>{text}</span>
                            </span>
                            <span className={statusBadge(t.status as LeadStatus)}>{t.status}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            )}

            <Card title="Where leads come from">
              <SourceBars sources={metrics.topSources} />
            </Card>
          </div>

          {activity && activity.length > 0 && (
            <Card title="Recent activity">
              <ul className="space-y-2.5">
                {activity.map((a) => (
                  <li className="flex items-start gap-2.5 text-sm" key={a.id}>
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
                    <span className="text-slate-600">
                      <Link className="font-medium text-slate-800 hover:text-brand-600" href={`/studio/leads/${a.leadId}`}>
                        {a.leadName}
                      </Link>{' '}
                      — {a.body || a.type}
                      <span className="ml-1 text-xs text-slate-400">· {timeAgo(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {isAdmin && (
        <Card
          action={
            web ? (
              <span className="text-xs text-slate-400">last 7 days</span>
            ) : (
              <a
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
                href="https://posthog.com/docs/api"
                rel="noopener noreferrer"
                target="_blank"
              >
                Connect
              </a>
            )
          }
          title="Website analytics"
        >
          {web ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Page views" value={web.pageviews.toLocaleString()} />
                <Kpi label="Visitors" value={web.visitors.toLocaleString()} />
              </div>
              {web.topPages.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Top pages</p>
                  <ul className="space-y-1">
                    {web.topPages.map((p) => (
                      <li className="flex justify-between text-sm" key={p.path}>
                        <span className="truncate text-slate-600">{p.path}</span>
                        <span className="text-slate-400">{p.views.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {isPostHogConfigured()
                ? 'Couldn’t load analytics right now — check the PostHog API key and project id.'
                : 'Connect your PostHog project to see live traffic, visitors and top pages here. Set POSTHOG_PROJECT_ID and POSTHOG_API_KEY in your environment.'}
            </p>
          )}
        </Card>
      )}

      {isAdmin && failedLogins && (
        <Card title="Security — failed sign-ins">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Kpi
                accent={failedLogins.last24h > 0}
                label="Last 24 hours"
                value={failedLogins.last24h}
              />
              <Kpi label="Last 7 days" value={failedLogins.last7d} />
            </div>
            {failedLogins.recent.length === 0 ? (
              <p className="py-2 text-center text-sm text-slate-400">
                No failed sign-in attempts recently 🔒
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {failedLogins.recent.map((f) => (
                  <li className="flex items-center justify-between gap-3 py-2 text-sm" key={f.id}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">
                        {f.email || 'Unknown account'}
                      </span>
                      <span className="text-xs text-slate-500">{f.summary || 'Failed sign-in'}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(f.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {content && (
        <section className="grid grid-cols-3 gap-3">
          <Kpi href="/studio/services" label="Services" value={content.services} />
          <Kpi href="/studio/posts" label="Blog posts" value={content.posts} />
          <Kpi href="/studio/testimonials" label="Reviews" value={content.reviews} />
        </section>
      )}
    </div>
  )
}
