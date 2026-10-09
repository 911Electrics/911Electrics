import 'server-only'

import { query } from '@/db/client'

import type { LeadStatus } from './constants'

export type LeadRow = {
  id: number
  status: LeadStatus
  name: string
  phone: string
  email: string | null
  service: string | null
  address: string | null
  message: string | null
  sourcePath: string | null
  formLocation: string | null
  emailSent: boolean | null
  emailError: string | null
  estimatedValue: number | null
  nextFollowUpAt: string | null
  createdAt: string
  assignedTo: number | null
  assigneeName: string | null
  utm: {
    source: string | null
    medium: string | null
    campaign: string | null
    term: string | null
    content: string | null
  }
}

type Row = {
  id: number
  status: string | null
  name: string | null
  phone: string | null
  email: string | null
  service: string | null
  address: string | null
  message: string | null
  source_path: string | null
  form_location: string | null
  email_sent: boolean | null
  email_error: string | null
  estimated_value: string | number | null
  next_follow_up_at: string | null
  created_at: string
  assigned_to: number | null
  assignee_name: string | null
  assignee_email: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
}

const SELECT = `
  SELECT l.id, l.status, l.name, l.phone, l.email, l.service, l.address, l.message,
         l.source_path, l.form_location, l.email_sent, l.email_error, l.estimated_value,
         l.next_follow_up_at, l.created_at, l.assigned_to,
         l.utm_source, l.utm_medium, l.utm_campaign, l.utm_term, l.utm_content,
         u.name AS assignee_name, u.email AS assignee_email
  FROM leads l
  LEFT JOIN users u ON u.id = l.assigned_to
`

function map(r: Row): LeadRow {
  return {
    id: r.id,
    status: (r.status as LeadStatus) || 'new',
    name: r.name ?? '',
    phone: r.phone ?? '',
    email: r.email,
    service: r.service,
    address: r.address,
    message: r.message,
    sourcePath: r.source_path,
    formLocation: r.form_location,
    emailSent: r.email_sent,
    emailError: r.email_error,
    estimatedValue: r.estimated_value === null ? null : Number(r.estimated_value),
    nextFollowUpAt: r.next_follow_up_at,
    createdAt: r.created_at,
    assignedTo: r.assigned_to ?? null,
    assigneeName: r.assignee_name ?? r.assignee_email ?? null,
    utm: {
      source: r.utm_source,
      medium: r.utm_medium,
      campaign: r.utm_campaign,
      term: r.utm_term,
      content: r.utm_content,
    },
  }
}

export async function getLeads(
  status?: LeadStatus,
  assignedTo?: number,
  search?: string,
): Promise<LeadRow[]> {
  const conds: string[] = []
  const params: unknown[] = []
  if (status) {
    params.push(status)
    conds.push(`l.status = $${params.length}::enum_leads_status`)
  }
  if (assignedTo) {
    params.push(assignedTo)
    conds.push(`l.assigned_to = $${params.length}`)
  }
  const q = search?.trim()
  if (q) {
    params.push(`%${q}%`)
    conds.push(`(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length})`)
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = await query<Row>(`${SELECT} ${where} ORDER BY l.created_at DESC LIMIT 200`, params)
  return rows.map(map)
}

export async function getRecentLeads(limit = 6): Promise<LeadRow[]> {
  const rows = await query<Row>(`${SELECT} ORDER BY l.created_at DESC LIMIT $1`, [limit])
  return rows.map(map)
}

/**
 * Leads for the pipeline board. Open stages (new/contacted/quoted) are always
 * shown; won/lost are limited to the last 45 days so closed columns don't grow
 * without bound. Spam is excluded.
 */
export async function getPipelineLeads(): Promise<LeadRow[]> {
  const rows = await query<Row>(
    `${SELECT}
     WHERE l.status <> 'spam'
       AND (l.status IN ('new','contacted','quoted') OR l.updated_at > now() - interval '45 days')
     ORDER BY l.created_at DESC
     LIMIT 400`,
  )
  return rows.map(map)
}

/** Count of leads per status, for the filter chips. */
export async function getLeadStatusCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status::text AS status, count(*)::text AS count FROM leads GROUP BY status`,
  )
  const out: Record<string, number> = {}
  for (const r of rows) out[r.status] = Number(r.count)
  return out
}

export async function getLeadById(id: number): Promise<LeadRow | null> {
  const rows = await query<Row>(`${SELECT} WHERE l.id = $1 LIMIT 1`, [id])
  return rows[0] ? map(rows[0]) : null
}

/** Active users who can own a lead, for the assignee picker. */
export async function getAssignableUsers(): Promise<{ id: number; label: string }[]> {
  const rows = await query<{ id: number; name: string | null; email: string }>(
    `SELECT id, name, email FROM users WHERE disabled = false ORDER BY name NULLS LAST, email`,
  )
  return rows.map((r) => ({ id: r.id, label: r.name || r.email }))
}

export type DashboardCounts = {
  newLeads: number
  weekLeads: number
  totalLeads: number
  openValue: number
  services: number
  posts: number
}

export type LeadActivity = {
  id: number
  type: string
  body: string | null
  createdAt: string
}

export async function getLeadActivity(leadId: number): Promise<LeadActivity[]> {
  const rows = await query<{ id: number; type: string; body: string | null; created_at: string }>(
    `SELECT id, type, body, created_at FROM lead_activity
     WHERE lead_id = $1 ORDER BY created_at DESC, id DESC`,
    [leadId],
  )
  return rows.map((r) => ({ id: r.id, type: r.type, body: r.body, createdAt: r.created_at }))
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [leadCounts] = await query<{
    new_leads: string
    week_leads: string
    total_leads: string
    open_value: string
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'new')::text AS new_leads,
       count(*) FILTER (WHERE created_at > now() - interval '7 days')::text AS week_leads,
       count(*)::text AS total_leads,
       coalesce(sum(estimated_value) FILTER (WHERE status IN ('new','contacted','quoted')), 0)::text AS open_value
     FROM leads`,
  )
  const [svc] = await query<{ count: string }>(`SELECT count(*)::text FROM services`)
  const [pst] = await query<{ count: string }>(`SELECT count(*)::text FROM posts`)
  return {
    newLeads: Number(leadCounts?.new_leads ?? 0),
    weekLeads: Number(leadCounts?.week_leads ?? 0),
    totalLeads: Number(leadCounts?.total_leads ?? 0),
    openValue: Number(leadCounts?.open_value ?? 0),
    services: Number(svc?.count ?? 0),
    posts: Number(pst?.count ?? 0),
  }
}
