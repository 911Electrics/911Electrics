import 'server-only'

import { query } from '@/db/client'

import { isStudioPermission, type StudioPermission, type StudioRole } from './constants'

export type StudioUserRow = {
  id: number
  name: string | null
  email: string
  role: StudioRole
  permissions: StudioPermission[]
  disabled: boolean
  lastLoginAt: string | null
  createdAt: string
  totpEnabled: boolean
}

type Row = {
  id: number
  name: string | null
  email: string
  role: string
  permissions: unknown
  disabled: boolean | null
  last_login_at: string | null
  created_at: string
  totp_enabled: boolean | null
}

const map = (r: Row): StudioUserRow => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role === 'editor' ? 'editor' : 'admin',
  permissions: Array.isArray(r.permissions)
    ? r.permissions.filter((p): p is StudioPermission => typeof p === 'string' && isStudioPermission(p))
    : [],
  disabled: Boolean(r.disabled),
  lastLoginAt: r.last_login_at,
  createdAt: r.created_at,
  totpEnabled: Boolean(r.totp_enabled),
})

const SELECT = `SELECT id, name, email, role, permissions, disabled, last_login_at, created_at, totp_enabled FROM users`

export async function getUsers(): Promise<StudioUserRow[]> {
  const rows = await query<Row>(`${SELECT} ORDER BY created_at`)
  return rows.map(map)
}

export async function getUserById(id: number): Promise<StudioUserRow | null> {
  const rows = await query<Row>(`${SELECT} WHERE id = $1 LIMIT 1`, [id])
  return rows[0] ? map(rows[0]) : null
}

/** Count of enabled admins — used to prevent locking everyone out. */
export async function countActiveAdmins(): Promise<number> {
  const [r] = await query<{ count: string }>(
    `SELECT count(*)::text FROM users WHERE role = 'admin' AND disabled = false`,
  )
  return Number(r?.count ?? 0)
}
