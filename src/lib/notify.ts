import 'server-only'

import { Resend } from 'resend'

import type { SiteSettings } from '@/db/types'

import { telHref } from '@/lib/format'
import {
  brandFromSettings,
  emailButton,
  escapeHtml,
  renderBrandedEmail,
} from '@/lib/email-template'

export type NotifyResult = { ok: boolean; error?: string }

export type ResendDomainStatus =
  | { checked: false; reason: string }
  | { checked: true; found: false; domain: string }
  | { checked: true; found: true; domain: string; status: string }

/** The domain part of LEAD_FROM_EMAIL (or the default sender), e.g. "911electrics.com". */
function senderDomain(): string {
  const from = process.env.LEAD_FROM_EMAIL || 'leads@911electrics.com'
  return from.split('@')[1]?.trim().toLowerCase() || from
}

/**
 * Resend requires the *sending domain* to be DNS-verified, separately from
 * having a valid API key — an unverified domain makes every send fail with a
 * validation_error, silently, unless someone checks. Surfaced on the Setup
 * page so that failure mode can't hide again.
 */
export async function getResendDomainStatus(): Promise<ResendDomainStatus> {
  if (!process.env.RESEND_API_KEY) return { checked: false, reason: 'RESEND_API_KEY not set' }
  const domain = senderDomain()
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      // Setup page is force-dynamic; keep this fast and never block the page.
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { checked: false, reason: `Resend API returned ${res.status}` }
    const body = (await res.json()) as { data?: { name?: string; status?: string }[] }
    const match = (body.data ?? []).find((d) => d.name?.toLowerCase() === domain)
    if (!match) return { checked: true, found: false, domain }
    return { checked: true, found: true, domain, status: match.status ?? 'unknown' }
  } catch (err) {
    return {
      checked: false,
      reason: err instanceof Error ? err.message : 'Could not reach Resend',
    }
  }
}

export type LeadForNotify = {
  id: number
  name: string
  phone: string
  email?: string | null
  service?: string | null
}

export const esc = (s?: string | null): string =>
  (s ?? '').replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string,
  )

/**
 * Send an internal notification to a team member (gated on Resend). `html` is
 * the full branded document; `text` is an optional plain-text alternative,
 * which improves deliverability and gives text-only clients a clean fallback.
 */
export async function sendInternalEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<NotifyResult> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.LEAD_FROM_EMAIL || 'leads@911electrics.com',
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    })
    if (error) return { ok: false, error: `${error.name}: ${error.message}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

/** Studio link for a lead, used in notification bodies. */
export function leadLink(leadId: number): string {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
  return `${base}/studio/leads/${leadId}`
}

/** Branded auto-reply to the customer confirming we received their request. */
export async function sendCustomerAutoReply(
  lead: LeadForNotify,
  settings: SiteSettings,
): Promise<NotifyResult> {
  if (!lead.email) return { ok: false, error: 'no customer email' }
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
  const brand = brandFromSettings(settings)
  const forService = lead.service ? ` for ${escapeHtml(lead.service)}` : ''
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(lead.name)},</p>
    <p style="margin:0 0 16px;">Thanks for contacting ${escapeHtml(brand.businessName)} — we've received your request${forService} and a licensed electrician will reach out shortly, usually within 15 minutes during business hours.</p>
    <p style="margin:0 0 4px;">Need us right away? Give us a call:</p>
    ${emailButton(`Call ${brand.phone}`, telHref(brand.phone))}
    <p style="margin:16px 0 0;color:#64748b;font-size:14px;">Licensed, bonded &amp; insured · 24/7 emergency service across Los Angeles and the San Gabriel Valley.</p>`
  const html = renderBrandedEmail({
    brand,
    title: `We received your request — ${brand.businessName}`,
    heading: "We've got your request",
    preheader: 'A licensed electrician will reach out shortly — usually within 15 minutes.',
    bodyHtml,
  })
  const text = `Hi ${lead.name},\n\nThanks for contacting ${brand.businessName} — we've received your request${lead.service ? ` for ${lead.service}` : ''} and a licensed electrician will reach out shortly (usually within 15 minutes during business hours).\n\nNeed us right away? Call ${brand.phone}.\n\n— ${brand.businessName}\nCA Lic. #${brand.licenseNumber}`
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.LEAD_FROM_EMAIL || 'leads@911electrics.com',
      to: lead.email,
      subject: `We received your request — ${brand.businessName}`,
      html,
      text,
    })
    if (error) return { ok: false, error: `${error.name}: ${error.message}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

/** Text the owner about a new lead (Twilio REST API — no SDK). */
export async function sendOwnerSms(
  lead: LeadForNotify,
  ownerPhone: string | undefined,
): Promise<NotifyResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  const to = process.env.LEAD_SMS_TO || ownerPhone
  if (!sid || !token || !from) return { ok: false, error: 'Twilio not configured' }
  if (!to) return { ok: false, error: 'no SMS recipient' }

  const link = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/studio/leads/${lead.id}`
  const body = `New lead: ${lead.name} ${lead.phone}${lead.service ? ` · ${lead.service}` : ''}. ${link}`
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'sms failed' }
  }
}
