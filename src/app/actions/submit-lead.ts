'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { z } from 'zod'

import { query } from '@/db/client'
import {
  brandFromSettings,
  emailButton,
  emailInfoRows,
  escapeHtml,
  renderBrandedEmail,
} from '@/lib/email-template'
import { telHref } from '@/lib/format'
import { isHardFlood, scoreSpamHeuristics } from '@/lib/lead-spam'
import { sendCustomerAutoReply, sendOwnerSms } from '@/lib/notify'
import { getSiteSettings } from '@/lib/queries'

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+.-]{7,20}$/, 'Please enter a valid phone number'),
  email: z.union([z.literal(''), z.string().trim().email('Please enter a valid email')]).optional(),
  address: z.string().trim().max(200).optional(),
  service: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
  sourcePath: z.string().max(300).optional(),
  formLocation: z.enum(['hero', 'contact', 'contact-page']).optional(),
})

export type LeadFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

/**
 * Per-IP submission counts from the leads table (no extra infra, survives
 * across serverless instances). Used to flag bursts as spam — and only to hard
 * drop genuine floods — so a real customer is never silently lost.
 */
async function recentSubmissionCounts(
  ip: string | undefined,
): Promise<{ tenMin: number; hour: number }> {
  if (!ip) return { tenMin: 0, hour: 0 }
  try {
    const [r] = await query<{ ten_min: string; hour: string }>(
      `SELECT
         count(*) FILTER (WHERE created_at > now() - interval '10 minutes')::text AS ten_min,
         count(*) FILTER (WHERE created_at > now() - interval '1 hour')::text AS hour
       FROM leads WHERE ip = $1`,
      [ip],
    )
    return { tenMin: Number(r?.ten_min ?? 0), hour: Number(r?.hour ?? 0) }
  } catch {
    return { tenMin: 0, hour: 0 }
  }
}

async function verifyTurnstile(token: string | undefined, ip: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  // Turnstile is optional — if not configured, honeypot + time-trap still apply
  if (!secret) return true
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const data = (await res.json()) as { success: boolean }
    return data.success
  } catch {
    // Cloudflare outage shouldn't block real customers
    return true
  }
}

export async function submitLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const headerList = await headers()
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    undefined
  const userAgent = headerList.get('user-agent') ?? undefined

  // --- Spam scoring ---
  // We never silently discard a possible customer. Anything that looks like
  // spam is still saved, but marked `spam` so the owner can recover a false
  // positive from the Spam filter with one click. Only a genuine flood from a
  // single IP is hard-dropped, to protect the table.
  const counts = await recentSubmissionCounts(ip)
  if (isHardFlood(counts)) {
    // Genuine flood — drop silently so bots learn nothing.
    return { status: 'success' }
  }

  const honeypot = formData.get('company_website')
  let spamReason = scoreSpamHeuristics({
    honeypot: typeof honeypot === 'string' ? honeypot : null,
    startedAt: Number(formData.get('startedAt')),
    now: Date.now(),
    counts,
  })
  if (!spamReason) {
    const turnstileOk = await verifyTurnstile(
      formData.get('cf-turnstile-response')?.toString(),
      ip,
    )
    if (!turnstileOk) spamReason = 'Did not pass the bot challenge'
  }

  // --- Validation ---
  const parsed = leadSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? '',
    service: formData.get('service') ?? '',
    message: formData.get('message') ?? '',
    sourcePath: formData.get('sourcePath') ?? '',
    formLocation: formData.get('formLocation') ?? 'hero',
  })

  if (!parsed.success) {
    // Always surface the validation errors — even for a spam-flagged submission.
    // A real person who filled the form fast and made a typo must see the error
    // and get a chance to fix it, rather than a fake "success" that drops them.
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString()
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors }
  }

  const data = parsed.data
  // Controlled literal (never user input) — safe to interpolate into SQL.
  const leadStatus = spamReason ? 'spam' : 'new'

  // UTM params captured by the client from the landing URL
  const utm = {
    source: formData.get('utm_source')?.toString() || null,
    medium: formData.get('utm_medium')?.toString() || null,
    campaign: formData.get('utm_campaign')?.toString() || null,
    term: formData.get('utm_term')?.toString() || null,
    content: formData.get('utm_content')?.toString() || null,
  }

  // --- 1. Persist the lead (source of truth) ---
  let leadId: number
  try {
    const rows = await query<{ id: number }>(
      `INSERT INTO leads
         (status, name, phone, email, service, address, message, source_path, form_location,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content, ip, user_agent,
          updated_at, created_at)
       VALUES ('${leadStatus}'::enum_leads_status, $1, $2, $3, $4, $5, $6, $7, $8::enum_leads_form_location,
          $9, $10, $11, $12, $13, $14, $15, now(), now())
       RETURNING id`,
      [
        data.name,
        data.phone,
        data.email || null,
        data.service || null,
        data.address || null,
        data.message || null,
        data.sourcePath || null,
        data.formLocation ?? 'hero',
        utm.source,
        utm.medium,
        utm.campaign,
        utm.term,
        utm.content,
        ip ?? null,
        userAgent ?? null,
      ],
    )
    leadId = rows[0].id
  } catch (err) {
    console.error('Failed to save lead', err)
    return {
      status: 'error',
      message: 'Something went wrong — please call us at 747-255-8595.',
    }
  }

  // Flagged as spam: save it (so a false positive is recoverable) but skip all
  // notifications. The owner can reclassify it to "New" from the Spam filter.
  if (spamReason) {
    await query(
      `INSERT INTO lead_activity (lead_id, type, body) VALUES ($1, 'system', $2)`,
      [leadId, `Auto-flagged as spam: ${spamReason}. Move to "New" if this is a real customer.`],
    ).catch((e) => console.error('spam activity log failed', e))
    return {
      status: 'success',
      message: 'Thanks! We received your request and will call you shortly.',
    }
  }

  // --- 2. Email notification (best-effort, never blocks the lead) ---
  // Delivery status is recorded on the lead; the failure reason goes to the
  // server logs (Vercel).
  const recordEmailFailure = async (reason: string) => {
    console.warn(`Lead ${leadId}: notification email not sent — ${reason}`)
    try {
      await query(
        `UPDATE leads SET email_sent = false, email_error = $2, updated_at = now() WHERE id = $1`,
        [leadId, reason.slice(0, 500)],
      )
    } catch (updateErr) {
      console.error('Failed to record lead email status', updateErr)
    }
  }

  if (!process.env.RESEND_API_KEY) {
    await recordEmailFailure('RESEND_API_KEY is not set in this environment')
  } else {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const siteSettings = await getSiteSettings()
      const to = process.env.LEAD_NOTIFICATION_EMAIL || siteSettings.email
      if (!to) {
        throw new Error('No recipient — set LEAD_NOTIFICATION_EMAIL or the Site Settings email')
      }
      const brand = brandFromSettings(siteSettings)
      const studioUrl = `${brand.siteUrl}/studio/leads/${leadId}`
      const rows = emailInfoRows([
        { label: 'Name', value: data.name },
        {
          label: 'Phone',
          value: `<a href="${telHref(data.phone)}" style="color:#d01d24;text-decoration:none;font-weight:600;">${escapeHtml(data.phone)}</a>`,
          isHtml: true,
        },
        {
          label: 'Email',
          value: data.email
            ? `<a href="mailto:${escapeHtml(data.email)}" style="color:#d01d24;text-decoration:none;">${escapeHtml(data.email)}</a>`
            : '',
          isHtml: true,
        },
        { label: 'Service', value: data.service || '' },
        { label: 'Address', value: data.address || '' },
        { label: 'Message', value: data.message || '' },
        { label: 'Page', value: data.sourcePath || '' },
      ])
      const html = renderBrandedEmail({
        brand,
        title: `New lead: ${data.name}`,
        heading: 'New quote request',
        preheader: `${data.name}${data.service ? ` — ${data.service}` : ''} · ${data.phone}`,
        bodyHtml: `<p style="margin:0 0 12px;">A new quote request just came in from the website:</p>${rows}${emailButton('Open in Studio', studioUrl)}`,
      })
      const text = `New quote request\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email || '—'}\nService: ${data.service || '—'}\nAddress: ${data.address || '—'}\nMessage: ${data.message || '—'}\nPage: ${data.sourcePath || '—'}\n\nOpen in Studio: ${studioUrl}`

      // Resend reports API failures via the `error` field, not by throwing
      const { error } = await resend.emails.send({
        from: process.env.LEAD_FROM_EMAIL || 'leads@911electrics.com',
        to,
        subject: `New lead: ${data.name}${data.service ? ` — ${data.service}` : ''}`,
        html,
        text,
      })
      if (error) {
        throw new Error(`Resend rejected the email: ${error.name} — ${error.message}`)
      }
      await query(
        `UPDATE leads SET email_sent = true, email_error = NULL, updated_at = now() WHERE id = $1`,
        [leadId],
      )
    } catch (err) {
      console.error('Lead saved but notification email failed', err)
      await recordEmailFailure(err instanceof Error ? err.message : 'Unknown email error')
    }
  }

  // --- 3. Speed-to-lead: activity log + customer auto-reply + owner SMS (best-effort) ---
  const logActivity = (body: string) =>
    query(`INSERT INTO lead_activity (lead_id, type, body) VALUES ($1, 'system', $2)`, [
      leadId,
      body,
    ]).catch((e) => console.error('lead activity log failed', e))

  try {
    const settings = await getSiteSettings()
    await logActivity(
      `Lead received via ${data.formLocation ?? 'form'}${data.sourcePath ? ` on ${data.sourcePath}` : ''}`,
    )
    const leadForNotify = {
      id: leadId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      service: data.service || null,
    }
    const [customer, sms] = await Promise.all([
      sendCustomerAutoReply(leadForNotify, settings),
      sendOwnerSms(leadForNotify, settings.phone),
    ])
    if (customer.ok) await logActivity('Auto-reply email sent to customer')
    else if (data.email) await logActivity(`Customer auto-reply not sent — ${customer.error}`)
    if (sms.ok) await logActivity('SMS alert sent to owner')
    else if (process.env.TWILIO_ACCOUNT_SID) await logActivity(`Owner SMS not sent — ${sms.error}`)
  } catch (err) {
    console.error('Lead notifications failed', err)
  }

  return {
    status: 'success',
    message: 'Thanks! We received your request and will call you shortly.',
  }
}
