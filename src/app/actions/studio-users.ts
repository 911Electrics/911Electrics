'use server'

import crypto from 'crypto'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { getCurrentSessionId, getStudioUser, hashPassword } from '@/studio/auth'
import { STUDIO_ROLES, isStudioPermission, type StudioPermission, type StudioRole } from '@/studio/constants'
import { revokeAllSessions, revokeOtherSessions } from '@/studio/sessions'
import { countActiveAdmins } from '@/studio/users'

export type UserFormState = { error?: string; ok?: boolean }

async function requireAdmin() {
  const user = await getStudioUser()
  if (!user) throw new Error('Not authenticated')
  if (user.role !== 'admin') throw new Error('Admins only')
  return user
}

function parseRole(v: FormDataEntryValue | null): StudioRole {
  const s = String(v ?? '')
  return (STUDIO_ROLES as readonly string[]).includes(s) ? (s as StudioRole) : 'editor'
}

/** Permissions only apply to editors; admins are superusers (stored as []). */
function parsePermissions(role: StudioRole, formData: FormData): StudioPermission[] {
  if (role === 'admin') return []
  return formData
    .getAll('permissions')
    .map(String)
    .filter(isStudioPermission)
}

function validPassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  return null
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): string {
  if (err?.code === '23505') return 'A user with that email already exists.'
  return err instanceof Error ? err.message : 'Could not save the user.'
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim() || null
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const role = parseRole(formData.get('role'))
  const permissions = parsePermissions(role, formData)

  if (!emailRe.test(email)) return { error: 'Enter a valid email address.' }
  const pwErr = validPassword(password)
  if (pwErr) return { error: pwErr }

  const { salt, hash } = hashPassword(password)
  try {
    await query(
      `INSERT INTO users (name, email, role, permissions, salt, hash, login_attempts, disabled, updated_at, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, 0, false, now(), now())`,
      [name, email, role, JSON.stringify(permissions), salt, hash],
    )
  } catch (err) {
    return { error: dbError(err) }
  }
  await logAudit('user.create', {
    targetType: 'user',
    summary: `Created ${email} (${role}${role === 'editor' ? `: ${permissions.join(', ') || 'no access'}` : ''})`,
  })
  revalidatePath('/studio/team')
  redirect('/studio/team')
}

export async function updateUser(
  id: number,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const me = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim() || null
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = parseRole(formData.get('role'))
  const permissions = parsePermissions(role, formData)
  const disabled = formData.get('disabled') === 'on'

  if (!emailRe.test(email)) return { error: 'Enter a valid email address.' }

  // Don't let the last active admin demote/disable themselves out of access.
  if (id === me.id && (role !== 'admin' || disabled) && (await countActiveAdmins()) <= 1) {
    return { error: 'You are the only admin — promote someone else first.' }
  }

  try {
    await query(
      `UPDATE users SET name = $2, email = $3, role = $4, permissions = $5::jsonb, disabled = $6, updated_at = now() WHERE id = $1`,
      [id, name, email, role, JSON.stringify(permissions), disabled],
    )
  } catch (err) {
    return { error: dbError(err) }
  }
  // A disabled account should be kicked out of any live sessions immediately.
  if (disabled) await revokeAllSessions(id).catch(() => {})
  await logAudit('user.update', {
    targetType: 'user',
    targetId: id,
    summary: `Updated ${email} (${role}${role === 'editor' ? `: ${permissions.join(', ') || 'no access'}` : ''}${disabled ? ', disabled' : ''})`,
  })
  revalidatePath('/studio/team')
  redirect('/studio/team')
}

export async function setUserPassword(
  id: number,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin()
  const password = String(formData.get('password') ?? '')
  const pwErr = validPassword(password)
  if (pwErr) return { error: pwErr }

  const { salt, hash } = hashPassword(password)
  await query(
    `UPDATE users SET salt = $2, hash = $3, login_attempts = 0, lock_until = NULL, updated_at = now() WHERE id = $1`,
    [id, salt, hash],
  )
  // Force re-login everywhere with the new password.
  await revokeAllSessions(id).catch(() => {})
  await logAudit('user.password', { targetType: 'user', targetId: id, summary: 'Set password' })
  return { ok: true }
}

export async function deleteUser(id: number): Promise<void> {
  const me = await requireAdmin()
  if (id === me.id) throw new Error('You cannot delete your own account.')
  // Refuse if this is the last active admin.
  const [target] = await query<{ role: string; disabled: boolean }>(
    `SELECT role, disabled FROM users WHERE id = $1`,
    [id],
  )
  if (target?.role === 'admin' && !target.disabled && (await countActiveAdmins()) <= 1) {
    throw new Error('Cannot delete the only admin.')
  }
  await query(`DELETE FROM users WHERE id = $1`, [id])
  await logAudit('user.delete', { targetType: 'user', targetId: id })
  revalidatePath('/studio/team')
}

/** Any signed-in user changing their own password. */
export async function changeOwnPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')

  const current = String(formData.get('currentPassword') ?? '')
  const next = String(formData.get('newPassword') ?? '')
  const pwErr = validPassword(next)
  if (pwErr) return { error: pwErr }

  const [row] = await query<{ salt: string | null; hash: string | null }>(
    `SELECT salt, hash FROM users WHERE id = $1`,
    [me.id],
  )
  if (!row?.salt || !row.hash) return { error: 'Account error — contact support.' }
  const computed = crypto.pbkdf2Sync(current, row.salt, 25_000, 512, 'sha256').toString('hex')
  if (computed !== row.hash) return { error: 'Your current password is incorrect.' }

  const { salt, hash } = hashPassword(next)
  await query(`UPDATE users SET salt = $2, hash = $3, updated_at = now() WHERE id = $1`, [
    me.id,
    salt,
    hash,
  ])
  // Keep this device signed in, but sign out everywhere else.
  const currentSid = await getCurrentSessionId()
  await revokeOtherSessions(me.id, currentSid).catch(() => {})
  await logAudit('user.password.self', { summary: 'Changed own password' })
  return { ok: true }
}
