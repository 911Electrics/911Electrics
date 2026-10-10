import 'server-only'

import {
  type EmailBrand,
  emailButton,
  emailInfoRows,
  escapeHtml,
  renderBrandedEmail,
} from '@/lib/email-template'
import { telHref } from '@/lib/format'

export type LeadAlertData = {
  name: string
  phone: string
  email?: string | null
  service?: string | null
  address?: string | null
  message?: string | null
  sourcePath?: string | null
}

/**
 * The internal "new lead" alert sent to the owner. When `possibleSpamReason`
 * is set (the lead failed or skipped the bot challenge), the subject, heading,
 * HTML and text are all clearly marked POSSIBLE SPAM with the reason.
 */
export function buildLeadAlertEmail(opts: {
  brand: EmailBrand
  leadId: number
  data: LeadAlertData
  possibleSpamReason?: string | null
}): { subject: string; html: string; text: string } {
  const { brand, leadId, data } = opts
  const spam = opts.possibleSpamReason || null
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

  const baseSubject = `New lead: ${data.name}${data.service ? ` — ${data.service}` : ''}`
  const subject = spam ? `POSSIBLE SPAM — ${baseSubject}` : baseSubject

  const spamBanner = spam
    ? `<div style="margin:0 0 16px;padding:12px 14px;border:2px solid #f5a623;border-radius:8px;background:#fff8eb;color:#7a4b00;font-size:14px;line-height:1.5;">
  <strong>POSSIBLE SPAM.</strong> Reason: ${escapeHtml(spam)}.<br>
  This lead was saved in Studio under <strong>Spam</strong> and the customer did <strong>not</strong> get an auto-reply. If it looks real, call them and move it to "New" in Studio.
</div>`
    : ''

  const html = renderBrandedEmail({
    brand,
    title: spam ? `POSSIBLE SPAM — New lead: ${data.name}` : `New lead: ${data.name}`,
    heading: spam ? 'POSSIBLE SPAM: quote request' : 'New quote request',
    preheader: `${spam ? 'POSSIBLE SPAM · ' : ''}${data.name}${data.service ? ` — ${data.service}` : ''} · ${data.phone}`,
    bodyHtml: `${spamBanner}<p style="margin:0 0 12px;">${spam ? 'A quote request came in from the website but was flagged as possible spam:' : 'A new quote request just came in from the website:'}</p>${rows}${emailButton('Open in Studio', studioUrl)}`,
  })

  const spamText = spam
    ? `POSSIBLE SPAM\nReason: ${spam}\nSaved in Studio under Spam; the customer did NOT get an auto-reply. If it looks real, call them and move it to "New" in Studio.\n\n`
    : ''
  const text = `${spamText}${spam ? 'Quote request (possible spam)' : 'New quote request'}\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email || '—'}\nService: ${data.service || '—'}\nAddress: ${data.address || '—'}\nMessage: ${data.message || '—'}\nPage: ${data.sourcePath || '—'}\n\nOpen in Studio: ${studioUrl}`

  return { subject, html, text }
}
