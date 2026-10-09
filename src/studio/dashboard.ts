import 'server-only'

import { query } from '@/db/client'

import type { LeadStatus } from './constants'

export type StagePoint = { status: LeadStatus; count: number; value: number }
export type DayPoint = { day: string; count: number }
export type SourcePoint = { source: string; count: number }

export type LeadMetrics = {
  newLeads: number
  weekLeads: number
  prevWeekLeads: number
  totalLeads: number
  /** Average minutes from a lead arriving to the first human action (status/note). */
  avgFirstResponseMins: number | null
  respondedShare: number | null
  wonCount: number
  lostCount: number
  conversionRate: number | null
  openValue: number
  wonValueMonth: number
  avgJobValue: number | null
  pipelineByStage: StagePoint[]
  leadsByDay: DayPoint[]
  topSources: SourcePoint[]
}

export type TodoLead = {
  id: number
  name: string
  status: LeadStatus
  nextFollowUpAt: string | null
  createdAt: string
}

export type ActivityItem = {
  id: number
  type: string
  body: string | null
  createdAt: string
  leadId: number
  leadName: string
}

const STAGE_ORDER: LeadStatus[] = ['new', 'contacted', 'quoted', 'won', 'lost']

/** Fill a 14-day window so the trend chart has no gaps. */
function fill14Days(rows: { day: string; count: number }[]): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]))
  const out: DayPoint[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key, count: byDay.get(key) ?? 0 })
  }
  return out
}

export async function getLeadMetrics(): Promise<LeadMetrics> {
  const [agg] = await query<{
    new_leads: string
    week_leads: string
    prev_week_leads: string
    total_leads: string
    won_count: string
    lost_count: string
    open_value: string
    won_value_month: string
    avg_job_value: string | null
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'new')::text AS new_leads,
       count(*) FILTER (WHERE created_at > now() - interval '7 days' AND status <> 'spam')::text AS week_leads,
       count(*) FILTER (WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days' AND status <> 'spam')::text AS prev_week_leads,
       count(*) FILTER (WHERE status <> 'spam')::text AS total_leads,
       count(*) FILTER (WHERE status = 'won')::text AS won_count,
       count(*) FILTER (WHERE status = 'lost')::text AS lost_count,
       coalesce(sum(estimated_value) FILTER (WHERE status IN ('new','contacted','quoted')), 0)::text AS open_value,
       coalesce(sum(estimated_value) FILTER (WHERE status = 'won' AND updated_at > date_trunc('month', now())), 0)::text AS won_value_month,
       (avg(estimated_value) FILTER (WHERE status = 'won' AND estimated_value IS NOT NULL))::text AS avg_job_value
     FROM leads`,
  )

  const [resp] = await query<{ avg_mins: string | null; responded: string; eligible: string }>(
    `WITH first_resp AS (
       SELECT lead_id, min(created_at) AS first_at
       FROM lead_activity WHERE type IN ('status','note') GROUP BY lead_id
     )
     SELECT
       (avg(EXTRACT(EPOCH FROM (fr.first_at - l.created_at)) / 60)
         FILTER (WHERE fr.first_at IS NOT NULL))::text AS avg_mins,
       count(fr.first_at)::text AS responded,
       count(*)::text AS eligible
     FROM leads l
     LEFT JOIN first_resp fr ON fr.lead_id = l.id
     WHERE l.created_at > now() - interval '30 days' AND l.status <> 'spam'`,
  )

  const stageRows = await query<{ status: string; count: string; value: string }>(
    `SELECT status::text AS status, count(*)::text AS count, coalesce(sum(estimated_value),0)::text AS value
     FROM leads WHERE status <> 'spam' GROUP BY status`,
  )
  const stageMap = new Map(stageRows.map((r) => [r.status, r]))
  const pipelineByStage: StagePoint[] = STAGE_ORDER.map((s) => {
    const r = stageMap.get(s)
    return { status: s, count: r ? Number(r.count) : 0, value: r ? Number(r.value) : 0 }
  })

  const dayRows = await query<{ day: string; count: string }>(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::text AS count
     FROM leads WHERE created_at > now() - interval '14 days' AND status <> 'spam'
     GROUP BY 1`,
  )
  const leadsByDay = fill14Days(dayRows.map((r) => ({ day: r.day, count: Number(r.count) })))

  const sourceRows = await query<{ source: string; count: string }>(
    `SELECT coalesce(nullif(utm_source, ''), 'Direct') AS source, count(*)::text AS count
     FROM leads WHERE status <> 'spam' GROUP BY 1 ORDER BY count(*) DESC LIMIT 6`,
  )

  const wonCount = Number(agg?.won_count ?? 0)
  const lostCount = Number(agg?.lost_count ?? 0)
  const decided = wonCount + lostCount
  const eligible = Number(resp?.eligible ?? 0)
  const responded = Number(resp?.responded ?? 0)

  return {
    newLeads: Number(agg?.new_leads ?? 0),
    weekLeads: Number(agg?.week_leads ?? 0),
    prevWeekLeads: Number(agg?.prev_week_leads ?? 0),
    totalLeads: Number(agg?.total_leads ?? 0),
    avgFirstResponseMins: resp?.avg_mins != null ? Math.round(Number(resp.avg_mins)) : null,
    respondedShare: eligible > 0 ? responded / eligible : null,
    wonCount,
    lostCount,
    conversionRate: decided > 0 ? wonCount / decided : null,
    openValue: Number(agg?.open_value ?? 0),
    wonValueMonth: Number(agg?.won_value_month ?? 0),
    avgJobValue: agg?.avg_job_value != null ? Math.round(Number(agg.avg_job_value)) : null,
    pipelineByStage,
    leadsByDay,
    topSources: sourceRows.map((r) => ({ source: r.source, count: Number(r.count) })),
  }
}

/** Open leads that are overdue or due today for follow-up, plus new ones. */
export async function getTodoLeads(): Promise<TodoLead[]> {
  const rows = await query<{
    id: number
    name: string | null
    status: string
    next_follow_up_at: string | null
    created_at: string
  }>(
    `SELECT id, name, status::text AS status, next_follow_up_at, created_at
     FROM leads
     WHERE status NOT IN ('won','lost','spam')
       AND (status = 'new'
            OR (next_follow_up_at IS NOT NULL AND next_follow_up_at < now() + interval '1 day'))
     ORDER BY
       (next_follow_up_at IS NULL) ASC,
       next_follow_up_at ASC,
       created_at ASC
     LIMIT 8`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? 'Unnamed',
    status: r.status as LeadStatus,
    nextFollowUpAt: r.next_follow_up_at,
    createdAt: r.created_at,
  }))
}

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const rows = await query<{
    id: number
    type: string
    body: string | null
    created_at: string
    lead_id: number
    lead_name: string | null
  }>(
    `SELECT la.id, la.type, la.body, la.created_at, l.id AS lead_id, l.name AS lead_name
     FROM lead_activity la JOIN leads l ON l.id = la.lead_id
     ORDER BY la.created_at DESC, la.id DESC
     LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    body: r.body,
    createdAt: r.created_at,
    leadId: r.lead_id,
    leadName: r.lead_name ?? 'Unnamed',
  }))
}

export type FailedLogin = {
  id: number
  email: string | null
  summary: string | null
  createdAt: string
}

export type FailedLoginSummary = {
  last24h: number
  last7d: number
  recent: FailedLogin[]
}

/**
 * Recent failed Studio sign-ins, for the admin security widget. Reads the
 * `auth.login_failed` rows the auth flow already records in the audit log.
 */
export async function getFailedLogins(limit = 5): Promise<FailedLoginSummary> {
  const [agg] = await query<{ last_24h: string; last_7d: string }>(
    `SELECT
       count(*) FILTER (WHERE created_at > now() - interval '24 hours')::text AS last_24h,
       count(*) FILTER (WHERE created_at > now() - interval '7 days')::text AS last_7d
     FROM audit_log WHERE action = 'auth.login_failed'`,
  )
  const rows = await query<{
    id: number
    user_email: string | null
    summary: string | null
    created_at: string
  }>(
    `SELECT id, user_email, summary, created_at
     FROM audit_log WHERE action = 'auth.login_failed'
     ORDER BY created_at DESC, id DESC LIMIT $1`,
    [limit],
  )
  return {
    last24h: Number(agg?.last_24h ?? 0),
    last7d: Number(agg?.last_7d ?? 0),
    recent: rows.map((r) => ({
      id: r.id,
      email: r.user_email,
      summary: r.summary,
      createdAt: r.created_at,
    })),
  }
}

export type ContentCounts = { services: number; posts: number; reviews: number }

export async function getContentCounts(): Promise<ContentCounts> {
  const [r] = await query<{ services: string; posts: string; reviews: string }>(
    `SELECT
       (SELECT count(*) FROM services)::text AS services,
       (SELECT count(*) FROM posts)::text AS posts,
       (SELECT count(*) FROM testimonials)::text AS reviews`,
  )
  return {
    services: Number(r?.services ?? 0),
    posts: Number(r?.posts ?? 0),
    reviews: Number(r?.reviews ?? 0),
  }
}
