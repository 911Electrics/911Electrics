'use server'

import { revalidatePath } from 'next/cache'

import { query } from '@/db/client'
import { esc, leadLink, sendInternalEmail } from '@/lib/notify'
import { logAudit } from '@/studio/audit'
import { requireActionPermission } from '@/studio/auth'
import { LEAD_STATUS_LABEL, LEAD_STATUSES, type LeadStatus } from '@/studio/constants'
import { zonedInputToUtc } from '@/lib/business-time'

async function logActivity(leadId: number, type: string, body: string): Promise<void> {
  await query(`INSERT INTO lead_activity (lead_id, type, body) VALUES ($1, $2, $3)`, [
    leadId,
    type,
    body,
  ])
}

function refresh(id: number): void {
  revalidatePath('/studio/leads')
  revalidatePath(`/studio/leads/${id}`)
  revalidatePath('/studio/pipeline')
  revalidatePath('/studio')
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<void> {
  await requireActionPermission('leads')
  if (!LEAD_STATUSES.includes(status)) throw new Error('Invalid status')

  await query(`UPDATE leads SET status = $2::enum_leads_status, updated_at = now() WHERE id = $1`, [
    id,
    status,
  ])
  await logActivity(id, 'status', `Status changed to ${LEAD_STATUS_LABEL[status]}`)
  await logAudit('lead.status', { targetType: 'lead', targetId: id, summary: `Status → ${LEAD_STATUS_LABEL[status]}` })
  refresh(id)
}

export async function assignLead(id: number, assigneeId: number | null): Promise<void> {
  const user = await requireActionPermission('leads')

  let assignee: { name: string | null; email: string } | null = null
  if (assigneeId !== null) {
    const [u] = await query<{ name: string | null; email: string }>(
      `SELECT name, email FROM users WHERE id = $1 AND disabled = false`,
      [assigneeId],
    )
    if (!u) throw new Error('Unknown user')
    assignee = u
  }

  await query(`UPDATE leads SET assigned_to = $2, updated_at = now() WHERE id = $1`, [id, assigneeId])
  const label = assignee ? assignee.name || assignee.email : 'Unassigned'
  await logActivity(id, 'system', assigneeId === null ? 'Unassigned' : `Assigned to ${label}`)
  await logAudit('lead.assign', {
    targetType: 'lead',
    targetId: id,
    summary: assigneeId === null ? 'Unassigned a lead' : `Assigned a lead to ${label}`,
  })

  // Notify the new owner (unless they assigned it to themselves).
  if (assignee && assigneeId !== user.id) {
    const [lead] = await query<{ name: string | null; phone: string | null; service: string | null }>(
      `SELECT name, phone, service FROM leads WHERE id = $1`,
      [id],
    )
    const leadName = lead?.name || 'a lead'
    void sendInternalEmail(
      assignee.email,
      `You've been assigned: ${leadName}`,
      `<p>${esc(user.name || user.email)} assigned you a lead.</p>
       <p><b>${esc(leadName)}</b>${lead?.service ? ` — ${esc(lead.service)}` : ''}${lead?.phone ? `<br>${esc(lead.phone)}` : ''}</p>
       <p><a href="${leadLink(id)}">Open in Studio</a></p>`,
    ).catch(() => {})
  }

  refresh(id)
}

/** Notify any team members @mentioned by first or full name in a note. */
async function notifyMentions(
  leadId: number,
  note: string,
  author: { id: number; name: string | null; email: string },
): Promise<void> {
  const tokens = [...note.matchAll(/@([\p{L}][\p{L}.'-]*)/gu)].map((m) => m[1].toLowerCase())
  if (tokens.length === 0) return

  const users = await query<{ id: number; name: string | null; email: string }>(
    `SELECT id, name, email FROM users WHERE disabled = false`,
  )
  const targets = new Map<number, string>()
  for (const u of users) {
    if (u.id === author.id) continue
    const first = (u.name || '').trim().split(/\s+/)[0]?.toLowerCase()
    const full = (u.name || '').toLowerCase().replace(/\s+/g, '')
    if ((first && tokens.includes(first)) || (full && tokens.includes(full))) {
      targets.set(u.id, u.email)
    }
  }
  if (targets.size === 0) return

  const [lead] = await query<{ name: string | null }>(`SELECT name FROM leads WHERE id = $1`, [leadId])
  const leadName = lead?.name || 'a lead'
  for (const email of targets.values()) {
    void sendInternalEmail(
      email,
      `${author.name || author.email} mentioned you on ${leadName}`,
      `<p>${esc(author.name || author.email)} mentioned you in a note on <b>${esc(leadName)}</b>:</p>
       <blockquote>${esc(note)}</blockquote>
       <p><a href="${leadLink(leadId)}">Open in Studio</a></p>`,
    ).catch(() => {})
  }
}

export async function addLeadNote(id: number, formData: FormData): Promise<void> {
  const user = await requireActionPermission('leads')
  const body = String(formData.get('note') ?? '').trim()
  if (!body) return
  const note = body.slice(0, 2000)
  await logActivity(id, 'note', note)
  await notifyMentions(id, note, user)
  refresh(id)
}

export async function updateLeadDetails(id: number, formData: FormData): Promise<void> {
  await requireActionPermission('leads')

  const valueRaw = String(formData.get('estimatedValue') ?? '').trim()
  const value = valueRaw ? Number(valueRaw) : null
  const estimatedValue = value !== null && Number.isFinite(value) ? value : null

  const followRaw = String(formData.get('nextFollowUpAt') ?? '').trim()
  // Pacific wall time, not the server's UTC (see lib/business-time).
  const nextFollowUp = followRaw ? (zonedInputToUtc(followRaw)?.toISOString() ?? null) : null

  await query(
    `UPDATE leads SET estimated_value = $2, next_follow_up_at = $3,
       follow_up_notified_at = NULL, updated_at = now() WHERE id = $1`,
    [id, estimatedValue, nextFollowUp],
  )
  await logAudit('lead.update', { targetType: 'lead', targetId: id, summary: 'Updated lead details' })
  refresh(id)
}
