import 'server-only'

import { query } from '@/db/client'

import { getStudioUser } from './auth'

/** Record an admin/editor action for accountability. Best-effort; never throws. */
export async function logAudit(
  action: string,
  opts?: {
    targetType?: string
    targetId?: string | number
    summary?: string
    /** Override the actor (e.g. login events, where the session cookie isn't
     * readable yet). Defaults to the current Studio user. */
    actor?: { id?: number | null; email?: string | null }
  },
): Promise<void> {
  try {
    const actor = opts?.actor ?? (await getStudioUser())
    await query(
      `INSERT INTO audit_log (user_id, user_email, action, target_type, target_id, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actor?.id ?? null,
        actor?.email ?? null,
        action,
        opts?.targetType ?? null,
        opts?.targetId != null ? String(opts.targetId) : null,
        opts?.summary ?? null,
      ],
    )
  } catch (err) {
    console.error('audit log failed', err)
  }
}

export type AuditEntry = {
  id: number
  userEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  summary: string | null
  createdAt: string
}

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  const rows = await query<{
    id: number
    user_email: string | null
    action: string
    target_type: string | null
    target_id: string | null
    summary: string | null
    created_at: string
  }>(
    `SELECT id, user_email, action, target_type, target_id, summary, created_at
     FROM audit_log ORDER BY created_at DESC, id DESC LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({
    id: r.id,
    userEmail: r.user_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    summary: r.summary,
    createdAt: r.created_at,
  }))
}
