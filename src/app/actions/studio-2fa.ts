'use server'

import crypto from 'crypto'

import QRCode from 'qrcode'

import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { getStudioUser } from '@/studio/auth'
import {
  buildOtpAuthUri,
  formatSecretForDisplay,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotp,
} from '@/studio/totp'

const PBKDF2_ITERATIONS = 25_000
const PBKDF2_KEYLEN = 512
const PBKDF2_DIGEST = 'sha256'

export type TotpStatus = { enabled: boolean; recoveryRemaining: number }

export type BeginSetupResult =
  | { ok: true; secret: string; secretDisplay: string; qr: string; uri: string }
  | { ok: false; error: string }

export type ConfirmResult = { ok: true; recoveryCodes: string[] } | { ok: false; error: string }

export type SimpleResult = { ok: true } | { ok: false; error: string }

export async function getTotpStatus(): Promise<TotpStatus> {
  const me = await getStudioUser()
  if (!me) return { enabled: false, recoveryRemaining: 0 }
  const rows = await query<{ totp_enabled: boolean; totp_recovery_codes: string[] | null }>(
    `SELECT totp_enabled, totp_recovery_codes FROM users WHERE id = $1`,
    [me.id],
  )
  const u = rows[0]
  return {
    enabled: Boolean(u?.totp_enabled),
    recoveryRemaining: Array.isArray(u?.totp_recovery_codes) ? u.totp_recovery_codes.length : 0,
  }
}

/** Generate a fresh secret, stash it (inactive), and return the QR for scanning. */
export async function beginTotpSetup(): Promise<BeginSetupResult> {
  const me = await getStudioUser()
  if (!me) return { ok: false, error: 'Not signed in.' }

  const secret = generateTotpSecret()
  // Store as pending — totp_enabled stays false until the user proves they can
  // produce a code. Login is unaffected while enabled = false.
  await query(`UPDATE users SET totp_secret = $2, totp_enabled = false WHERE id = $1`, [
    me.id,
    secret,
  ])

  const uri = buildOtpAuthUri(secret, me.email)
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 })
  return { ok: true, secret, secretDisplay: formatSecretForDisplay(secret), qr, uri }
}

/** Verify the first code, activate 2FA, and hand back one-time recovery codes. */
export async function confirmTotpSetup(_prev: ConfirmResult, formData: FormData): Promise<ConfirmResult> {
  const me = await getStudioUser()
  if (!me) return { ok: false, error: 'Not signed in.' }

  const code = String(formData.get('code') ?? '').trim()
  const rows = await query<{ totp_secret: string | null; totp_enabled: boolean }>(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [me.id],
  )
  const secret = rows[0]?.totp_secret
  if (!secret) return { ok: false, error: 'Start the setup again.' }
  if (rows[0]?.totp_enabled) return { ok: false, error: 'Two-factor is already enabled.' }
  if (!verifyTotp(secret, code)) return { ok: false, error: 'That code is not valid. Try again.' }

  const { plain, hashed } = generateRecoveryCodes()
  await query(
    `UPDATE users SET totp_enabled = true, totp_confirmed_at = now(),
       totp_recovery_codes = $2::jsonb WHERE id = $1`,
    [me.id, JSON.stringify(hashed)],
  )
  await logAudit('user.2fa_enabled', { targetType: 'user', targetId: me.id, summary: 'Enabled two-factor authentication' })
  return { ok: true, recoveryCodes: plain }
}

function passwordMatches(password: string, salt: string, hash: string): boolean {
  const computed = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex')
  return (
    computed.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  )
}

/** Turn 2FA off. Requires the account password to confirm identity. */
export async function disableTotp(_prev: SimpleResult, formData: FormData): Promise<SimpleResult> {
  const me = await getStudioUser()
  if (!me) return { ok: false, error: 'Not signed in.' }

  const password = String(formData.get('password') ?? '')
  const rows = await query<{ salt: string | null; hash: string | null }>(
    `SELECT salt, hash FROM users WHERE id = $1`,
    [me.id],
  )
  const u = rows[0]
  if (!u?.salt || !u.hash || !passwordMatches(password, u.salt, u.hash)) {
    return { ok: false, error: 'Incorrect password.' }
  }

  await query(
    `UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_confirmed_at = NULL,
       totp_recovery_codes = '[]'::jsonb WHERE id = $1`,
    [me.id],
  )
  await logAudit('user.2fa_disabled', { targetType: 'user', targetId: me.id, summary: 'Disabled two-factor authentication' })
  return { ok: true }
}

/**
 * Admin: clear a user's 2FA (account recovery for a lost device). Doesn't touch
 * the password — the user can re-enrol from their account page afterwards.
 */
export async function adminResetUserTotp(userId: number): Promise<SimpleResult> {
  const me = await getStudioUser()
  if (!me || me.role !== 'admin') return { ok: false, error: 'Admins only.' }

  await query(
    `UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_confirmed_at = NULL,
       totp_recovery_codes = '[]'::jsonb WHERE id = $1`,
    [userId],
  )
  await logAudit('user.2fa_reset', {
    targetType: 'user',
    targetId: userId,
    summary: 'Reset two-factor authentication',
  })
  return { ok: true }
}

export type RegenResult = { ok: true; recoveryCodes: string[] } | { ok: false; error: string }

/** Issue a fresh set of recovery codes (invalidates the old ones). */
export async function regenerateRecoveryCodes(_prev: RegenResult, formData: FormData): Promise<RegenResult> {
  const me = await getStudioUser()
  if (!me) return { ok: false, error: 'Not signed in.' }

  const code = String(formData.get('code') ?? '').trim()
  const rows = await query<{ totp_secret: string | null; totp_enabled: boolean }>(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [me.id],
  )
  if (!rows[0]?.totp_enabled || !rows[0]?.totp_secret) {
    return { ok: false, error: 'Two-factor is not enabled.' }
  }
  if (!verifyTotp(rows[0].totp_secret, code)) {
    return { ok: false, error: 'That code is not valid.' }
  }

  const { plain, hashed } = generateRecoveryCodes()
  await query(`UPDATE users SET totp_recovery_codes = $2::jsonb WHERE id = $1`, [
    me.id,
    JSON.stringify(hashed),
  ])
  await logAudit('user.2fa_recovery_regenerated', {
    targetType: 'user',
    targetId: me.id,
    summary: 'Regenerated 2FA recovery codes',
  })
  return { ok: true, recoveryCodes: plain }
}
