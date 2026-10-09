import 'server-only'

import { query } from '@/db/client'

export type SessionRow = {
  id: string
  createdAt: string
  lastSeenAt: string
  ip: string | null
  device: string
  current: boolean
}

/** Turn a raw user-agent into a short, friendly device label. */
export function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device'
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'
  const os =
    /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : ''
  return os ? `${browser} on ${os}` : browser
}

export async function getUserSessions(userId: number, currentSid: string | null): Promise<SessionRow[]> {
  const rows = await query<{
    id: string
    created_at: string
    last_seen_at: string
    ip: string | null
    user_agent: string | null
  }>(
    `SELECT id, created_at, last_seen_at, ip, user_agent
     FROM studio_sessions
     WHERE user_id = $1 AND revoked = false
     ORDER BY last_seen_at DESC`,
    [userId],
  )
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
    ip: r.ip,
    device: describeDevice(r.user_agent),
    current: r.id === currentSid,
  }))
}

/** Revoke one of a user's own sessions. */
export async function revokeSession(userId: number, sid: string): Promise<void> {
  await query(`UPDATE studio_sessions SET revoked = true WHERE id = $1 AND user_id = $2`, [sid, userId])
}

/** Revoke every session for a user except an optional one to keep (the current). */
export async function revokeOtherSessions(userId: number, keepSid: string | null): Promise<void> {
  await query(
    `UPDATE studio_sessions SET revoked = true WHERE user_id = $1 AND revoked = false AND id <> $2`,
    [userId, keepSid ?? ''],
  )
}

/** Revoke all of a user's sessions (e.g. on disable or admin password reset). */
export async function revokeAllSessions(userId: number): Promise<void> {
  await query(`UPDATE studio_sessions SET revoked = true WHERE user_id = $1 AND revoked = false`, [
    userId,
  ])
}
