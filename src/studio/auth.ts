import 'server-only'

import crypto from 'crypto'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { query } from '@/db/client'

import { logAudit } from './audit'
import {
  STUDIO_PERMISSIONS,
  isStudioPermission,
  type StudioPermission,
  type StudioRole,
} from './constants'

/**
 * Payload-free Studio auth.
 *
 * Verifies credentials directly against the `users` table (Payload's PBKDF2
 * salt+hash, so existing passwords keep working) and issues our own HMAC-signed
 * session cookie. Adds roles, disabled accounts, login lockout and last-login
 * tracking. Reuses PAYLOAD_SECRET as the signing key.
 */

const SESSION_COOKIE = 'studio_session'
const TFA_COOKIE = 'studio_2fa'
const SESSION_TTL_SECONDS = 8 * 60 * 60 // 8 hours
const TFA_TTL_SECONDS = 5 * 60 // 5 minutes to enter the code
const PBKDF2_ITERATIONS = 25_000
const PBKDF2_KEYLEN = 512
const PBKDF2_DIGEST = 'sha256'
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export type StudioUser = {
  id: number
  email: string
  name: string | null
  role: StudioRole
  /** Effective permissions — admins implicitly have all of them. */
  permissions: StudioPermission[]
}

/** Does this user have a given grantable permission? Admins always do. */
export function can(user: StudioUser | null, perm: StudioPermission): boolean {
  return !!user && (user.role === 'admin' || user.permissions.includes(perm))
}

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  return secret
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

/** Generate a Payload-compatible salt + hash for a new/changed password. */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(32).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex')
  return { salt, hash }
}

function createToken(
  userId: number,
  ttlSeconds: number,
  kind: 'session' | '2fa',
  sid?: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const body = Buffer.from(JSON.stringify({ uid: userId, exp, k: kind, sid })).toString('base64url')
  return `${body}.${sign(body)}`
}

function verifyToken(
  token: string,
  kind: 'session' | '2fa',
): { uid: number; exp: number; sid?: string } | null {
  const [body, sig] = token.split('.')
  if (!body || !sig || !timingSafeStrEqual(sig, sign(body))) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString()) as {
      uid: number
      exp: number
      k?: string
      sid?: string
    }
    if (parsed.k !== kind) return null
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

/** Create a server-side session row and issue the cookie that references it. */
async function issueSession(userId: number): Promise<void> {
  const sid = crypto.randomBytes(32).toString('hex')
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const ua = h.get('user-agent') || null
  await query(
    `INSERT INTO studio_sessions (id, user_id, ip, user_agent) VALUES ($1, $2, $3, $4)`,
    [sid, userId, ip, ua],
  ).catch((e) => console.error('session insert failed', e))

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createToken(userId, SESSION_TTL_SECONDS, 'session', sid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  })
}

/** The current request's session id, if signed in with a managed session. */
export async function getCurrentSessionId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token, 'session')?.sid ?? null
}

export async function getStudioUser(): Promise<StudioUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = verifyToken(token, 'session')
  if (!session) return null

  // Managed session: it must still exist and not be revoked.
  if (!session.sid) return null
  const [sess] = await query<{ user_id: number; revoked: boolean }>(
    `SELECT user_id, revoked FROM studio_sessions WHERE id = $1`,
    [session.sid],
  )
  if (!sess || sess.revoked || sess.user_id !== session.uid) return null
  // Throttled last-seen update.
  query(
    `UPDATE studio_sessions SET last_seen_at = now()
     WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'`,
    [session.sid],
  ).catch(() => {})

  const rows = await query<{
    id: number
    email: string
    name: string | null
    role: string
    permissions: unknown
  }>(
    `SELECT id, email, name, role, permissions FROM users WHERE id = $1 AND disabled = false LIMIT 1`,
    [session.uid],
  )
  const u = rows[0]
  if (!u) return null
  const role: StudioRole = u.role === 'editor' ? 'editor' : 'admin'
  const permissions: StudioPermission[] =
    role === 'admin'
      ? [...STUDIO_PERMISSIONS]
      : Array.isArray(u.permissions)
        ? u.permissions.filter((p): p is StudioPermission => typeof p === 'string' && isStudioPermission(p))
        : []
  return { id: u.id, email: u.email, name: u.name, role, permissions }
}

/** Guard for a page/subtree that requires a grantable permission. */
export async function requirePermission(perm: StudioPermission): Promise<StudioUser> {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (!can(me, perm)) redirect('/studio')
  return me
}

/** Guard for admin-only areas (team, business info, audit log). */
export async function requireAdminPage(): Promise<StudioUser> {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')
  return me
}

/**
 * Guards for server actions. A `layout.tsx` guard only protects the *page*: a
 * server action is its own POST endpoint, reachable by any signed-in user who
 * sends the request directly, whether or not they could open the screen that
 * hosts the form. So every mutating action authorizes for itself.
 *
 * These throw rather than redirect — an action called from a client component
 * (drag-and-drop, a row button) has nowhere to be redirected to, and a thrown
 * error surfaces in the form state or the Studio error boundary.
 */
export async function requireActionPermission(perm: StudioPermission): Promise<StudioUser> {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')
  if (!can(me, perm)) throw new Error('Not allowed')
  return me
}

/** Server-action guard for admin-only areas (business info, team, redirects). */
export async function requireActionAdmin(): Promise<StudioUser> {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')
  if (me.role !== 'admin') throw new Error('Admins only')
  return me
}

export type StudioLoginResult =
  | { ok: true }
  | { ok: false; needsTotp: true }
  | { ok: false; error: string }

// Per-IP throttle (in addition to per-account lockout) to stop credential
// spraying across many accounts from one address.
const IP_MAX_FAILS = 15
const IP_WINDOW_MIN = 15
const IP_LOCK_MIN = 15

async function getClientIp(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

async function ipLocked(ip: string | null): Promise<boolean> {
  if (!ip) return false
  const [r] = await query<{ locked_until: string | null }>(
    `SELECT locked_until FROM login_throttle WHERE ip = $1`,
    [ip],
  ).catch(() => [])
  return Boolean(r?.locked_until && new Date(r.locked_until).getTime() > Date.now())
}

async function recordIpFailure(ip: string | null): Promise<void> {
  if (!ip) return
  const [r] = await query<{ fails: number; window_start: string }>(
    `SELECT fails, window_start FROM login_throttle WHERE ip = $1`,
    [ip],
  ).catch(() => [])
  const now = Date.now()
  let fails = 1
  let windowStart = new Date(now)
  if (r) {
    const ws = new Date(r.window_start).getTime()
    if (now - ws < IP_WINDOW_MIN * 60_000) {
      fails = Number(r.fails) + 1
      windowStart = new Date(ws)
    }
  }
  const lockedUntil = fails >= IP_MAX_FAILS ? new Date(now + IP_LOCK_MIN * 60_000) : null
  await query(
    `INSERT INTO login_throttle (ip, fails, window_start, locked_until) VALUES ($1, $2, $3, $4)
     ON CONFLICT (ip) DO UPDATE SET fails = $2, window_start = $3, locked_until = $4`,
    [ip, fails, windowStart.toISOString(), lockedUntil ? lockedUntil.toISOString() : null],
  ).catch(() => {})
}

async function clearIpThrottle(ip: string | null): Promise<void> {
  if (!ip) return
  await query(`DELETE FROM login_throttle WHERE ip = $1`, [ip]).catch(() => {})
}

export async function studioLogin(email: string, password: string): Promise<StudioLoginResult> {
  const ip = await getClientIp()
  const tooMany: StudioLoginResult = {
    ok: false,
    error: 'Too many attempts. Try again in a few minutes.',
  }
  if (await ipLocked(ip)) return tooMany

  const rows = await query<{
    id: number
    email: string
    salt: string | null
    hash: string | null
    disabled: boolean | null
    login_attempts: string | number | null
    lock_until: string | null
    totp_enabled: boolean | null
  }>(
    `SELECT id, email, salt, hash, disabled, login_attempts, lock_until, totp_enabled
     FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email.trim()],
  )
  const user = rows[0]
  const invalid: StudioLoginResult = { ok: false, error: 'Invalid email or password.' }
  if (!user?.salt || !user.hash) {
    await recordIpFailure(ip)
    await logAudit('auth.login_failed', { actor: { email: email.trim() }, summary: 'No matching account' })
    return invalid
  }

  if (user.disabled) {
    await logAudit('auth.login_failed', {
      actor: { id: user.id, email: user.email },
      summary: 'Account disabled',
    })
    return { ok: false, error: 'This account has been disabled.' }
  }

  if (user.lock_until && new Date(user.lock_until).getTime() > Date.now()) {
    return { ok: false, error: 'Too many attempts. Try again in a few minutes.' }
  }

  const computed = crypto
    .pbkdf2Sync(password, user.salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex')

  if (!timingSafeStrEqual(computed, user.hash)) {
    const attempts = Number(user.login_attempts ?? 0) + 1
    const lockUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
    await query(`UPDATE users SET login_attempts = $2, lock_until = $3 WHERE id = $1`, [
      user.id,
      attempts,
      lockUntil ? lockUntil.toISOString() : null,
    ]).catch(() => {})
    await recordIpFailure(ip)
    await logAudit('auth.login_failed', {
      actor: { id: user.id, email: user.email },
      summary: 'Wrong password',
    })
    return invalid
  }

  // Correct password — clear this IP's failure streak.
  await clearIpThrottle(ip)

  // Password is correct. If 2FA is on, defer the session to the second step.
  if (user.totp_enabled) {
    const cookieStore = await cookies()
    cookieStore.set(TFA_COOKIE, createToken(user.id, TFA_TTL_SECONDS, '2fa'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(Date.now() + TFA_TTL_SECONDS * 1000),
    })
    return { ok: false, needsTotp: true }
  }

  await query(
    `UPDATE users SET login_attempts = 0, lock_until = NULL, last_login_at = now() WHERE id = $1`,
    [user.id],
  ).catch(() => {})

  await issueSession(user.id)
  await logAudit('auth.login', { actor: { id: user.id, email: user.email }, summary: 'Signed in' })
  return { ok: true }
}

/** Is there a valid pending-2FA cookie from a passed password step? */
export async function getPending2faUserId(): Promise<number | null> {
  const token = (await cookies()).get(TFA_COOKIE)?.value
  if (!token) return null
  return verifyToken(token, '2fa')?.uid ?? null
}

/**
 * Second login step: verify the authenticator code (or a recovery code) for the
 * user identified by the pending-2FA cookie, then issue the real session.
 */
export async function completeTotpLogin(code: string): Promise<StudioLoginResult> {
  const uid = await getPending2faUserId()
  if (!uid) return { ok: false, error: 'Your session expired. Sign in again.' }

  // The second factor is throttled on the same terms as the password step.
  // Without this an attacker holding a stolen password could sit on the
  // 5-minute pending-2FA cookie and spray six-digit codes; with a ±1 step
  // drift window three of a million are live at any moment, which is well
  // within reach at machine speed.
  const ip = await getClientIp()
  const tooMany: StudioLoginResult = {
    ok: false,
    error: 'Too many attempts. Try again in a few minutes.',
  }
  if (await ipLocked(ip)) return tooMany

  const { verifyTotp, consumeRecoveryCode } = await import('./totp')
  const rows = await query<{
    id: number
    email: string
    login_attempts: string | number | null
    lock_until: string | null
    totp_secret: string | null
    totp_enabled: boolean | null
    totp_recovery_codes: string[] | null
  }>(
    `SELECT id, email, login_attempts, lock_until, totp_secret, totp_enabled, totp_recovery_codes
     FROM users WHERE id = $1 AND disabled = false LIMIT 1`,
    [uid],
  )
  const user = rows[0]
  if (!user?.totp_secret || !user.totp_enabled) {
    return { ok: false, error: 'Two-factor is not set up. Sign in again.' }
  }

  if (user.lock_until && new Date(user.lock_until).getTime() > Date.now()) {
    return tooMany
  }

  const cleaned = code.replace(/\s+/g, '')
  let verified = verifyTotp(user.totp_secret, cleaned)

  if (!verified) {
    // Maybe it's a recovery code.
    const remaining = consumeRecoveryCode(user.totp_recovery_codes ?? [], cleaned)
    if (remaining) {
      verified = true
      await query(`UPDATE users SET totp_recovery_codes = $2::jsonb WHERE id = $1`, [
        user.id,
        JSON.stringify(remaining),
      ]).catch(() => {})
    }
  }

  if (!verified) {
    const attempts = Number(user.login_attempts ?? 0) + 1
    const lockUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
    await query(`UPDATE users SET login_attempts = $2, lock_until = $3 WHERE id = $1`, [
      user.id,
      attempts,
      lockUntil ? lockUntil.toISOString() : null,
    ]).catch(() => {})
    await recordIpFailure(ip)
    await logAudit('auth.login_failed', {
      actor: { id: user.id, email: user.email },
      summary: 'Wrong two-factor code',
    })
    if (lockUntil) {
      // Locked out: drop the pending cookie so the password step must be
      // passed again rather than leaving a live 2FA prompt sitting there.
      ;(await cookies()).delete(TFA_COOKIE)
      return tooMany
    }
    return { ok: false, error: 'Invalid code. Try again.' }
  }

  await clearIpThrottle(ip)
  const cookieStore = await cookies()
  cookieStore.delete(TFA_COOKIE)
  await query(
    `UPDATE users SET login_attempts = 0, lock_until = NULL, last_login_at = now() WHERE id = $1`,
    [user.id],
  ).catch(() => {})
  await issueSession(user.id)
  await logAudit('auth.login', {
    actor: { id: user.id, email: user.email },
    summary: 'Signed in (2FA)',
  })
  return { ok: true }
}

export async function studioLogout(): Promise<void> {
  await logAudit('auth.logout', { summary: 'Signed out' })
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const sid = token ? verifyToken(token, 'session')?.sid : null
  if (sid) {
    await query(`UPDATE studio_sessions SET revoked = true WHERE id = $1`, [sid]).catch(() => {})
  }
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(TFA_COOKIE)
}
