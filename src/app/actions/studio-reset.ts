'use server'

import crypto from 'crypto'

import { Resend } from 'resend'

import { query } from '@/db/client'
import { getSiteSettings } from '@/lib/queries'
import { logAudit } from '@/studio/audit'
import { getStudioUser, hashPassword } from '@/studio/auth'

export type ResetState = { error?: string; ok?: boolean }

const TOKEN_TTL_MIN = 60
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

async function emailResetLink(email: string, rawToken: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
  const link = `${base}/studio/reset?token=${rawToken}&email=${encodeURIComponent(email)}`
  try {
    const settings = await getSiteSettings().catch(() => null)
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.LEAD_FROM_EMAIL || 'leads@911electrics.com',
      to: email,
      subject: `Set your ${settings?.businessName ?? 'Studio'} password`,
      html: `
        <p>Use this link within ${TOKEN_TTL_MIN} minutes to set your password:</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you didn't request this, you can ignore this email.</p>`,
    })
  } catch (err) {
    console.error('reset email failed', err)
  }
}

/** Public "forgot password" — always returns ok (don't reveal whether the email exists). */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) return { error: 'Enter your email address.' }

  const [user] = await query<{ id: number; email: string }>(
    `SELECT id, email FROM users WHERE lower(email) = lower($1) AND disabled = false LIMIT 1`,
    [email],
  )
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiration = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString()
    await query(
      `UPDATE users SET reset_password_token = $2, reset_password_expiration = $3 WHERE id = $1`,
      [user.id, sha(token), expiration],
    )
    await emailResetLink(user.email, token)
  }
  return { ok: true }
}

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const [user] = await query<{
    id: number
    reset_password_token: string | null
    reset_password_expiration: string | null
  }>(
    `SELECT id, reset_password_token, reset_password_expiration
     FROM users WHERE lower(email) = lower($1) AND disabled = false LIMIT 1`,
    [email],
  )
  if (!user?.reset_password_token || !token || sha(token) !== user.reset_password_token) {
    return { error: 'This link is invalid. Request a new one.' }
  }
  if (
    !user.reset_password_expiration ||
    new Date(user.reset_password_expiration).getTime() < Date.now()
  ) {
    return { error: 'This link has expired. Request a new one.' }
  }

  const { salt, hash } = hashPassword(password)
  await query(
    `UPDATE users SET salt = $2, hash = $3, reset_password_token = NULL,
       reset_password_expiration = NULL, login_attempts = 0, lock_until = NULL, updated_at = now()
     WHERE id = $1`,
    [user.id, salt, hash],
  )
  // Invalidate any sessions open before the reset.
  await query(`UPDATE studio_sessions SET revoked = true WHERE user_id = $1 AND revoked = false`, [
    user.id,
  ]).catch(() => {})
  return { ok: true }
}

/** Admin: email a user a set-password / invite link. */
export async function sendResetLinkToUser(userId: number): Promise<void> {
  const me = await getStudioUser()
  if (!me || me.role !== 'admin') throw new Error('Admins only')
  const [user] = await query<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [userId])
  if (!user?.email) return
  const fd = new FormData()
  fd.set('email', user.email)
  await requestPasswordReset({}, fd)
  await logAudit('user.reset_link', { targetType: 'user', targetId: userId, summary: `Sent password link to ${user.email}` })
}
