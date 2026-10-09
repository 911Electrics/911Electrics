import 'server-only'

import type { SiteSettings } from '@/db/types'

import { telHref } from '@/lib/format'

/**
 * Branded HTML email shell. Emails were previously bare `<p>`/`<table>` markup
 * that rendered as unstyled plain text; this wraps content in a layout that
 * mirrors the website chrome — the navy "Licensed & Insured" strip, a white
 * logo header with the red brand accent, and a navy footer with license and
 * contact details.
 *
 * Everything is table-based with inline styles and hex colors (OKLCH, classes,
 * and <style> blocks are unreliable across email clients), constrained to a
 * 600px container that degrades to full width on phones.
 */

// Website palette, mapped to email-safe hex (see globals.css @theme).
const RED = '#d01d24' // brand-600 / theme-color
const NAVY = '#101828' // navy-950
const AMBER = '#f5a623' // amber-accent
const INK = '#1a2233'
const MUTED = '#64748b'
const BORDER = '#e5e7eb'
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export type EmailBrand = {
  businessName: string
  licenseNumber: string
  phone: string
  siteUrl: string
  logoUrl?: string | null
  addressLine?: string | null
}

/** Sensible defaults for callers without Site Settings loaded (e.g. cron). */
export function defaultBrand(): EmailBrand {
  return {
    businessName: '911 Construction & Electric Inc.',
    licenseNumber: '1027421',
    phone: '747-255-8595',
    siteUrl: (process.env.NEXT_PUBLIC_SERVER_URL || 'https://911electrics.com').replace(/\/$/, ''),
    logoUrl: null,
    addressLine: null,
  }
}

/** Build brand info from Site Settings (used by lead + customer emails). */
export function brandFromSettings(s: SiteSettings): EmailBrand {
  const siteUrl = (process.env.NEXT_PUBLIC_SERVER_URL || 'https://911electrics.com').replace(/\/$/, '')
  const logo = s.logo && typeof s.logo === 'object' ? s.logo.url : null
  const parts = [s.address?.street, s.address?.city, s.address?.state, s.address?.zip].filter(Boolean)
  return {
    businessName: s.businessName,
    licenseNumber: s.licenseNumber,
    phone: s.phone,
    siteUrl,
    logoUrl: logo && /^https?:\/\//.test(logo) ? logo : logo ? `${siteUrl}${logo}` : null,
    addressLine: parts.length ? parts.join(', ') : null,
  }
}

export const escapeHtml = (s?: string | null): string =>
  (s ?? '').replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string,
  )

/** Bulletproof red CTA button. */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="border-radius:8px;background:${RED};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`
}

/** Two-column detail table (e.g. lead fields). Values may be pre-built HTML. */
export function emailInfoRows(rows: { label: string; value: string; isHtml?: boolean }[]): string {
  const body = rows
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr>
        <td style="padding:9px 12px;border-bottom:1px solid #eef0f3;font-family:${FONT};font-size:13px;font-weight:700;color:#475569;width:110px;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #eef0f3;font-family:${FONT};font-size:14px;color:${INK};">${r.isHtml ? r.value : escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 4px;border:1px solid #eef0f3;border-radius:8px;overflow:hidden;">${body}</table>`
}

/**
 * Wrap body HTML in the full branded shell. `bodyHtml` is inserted verbatim
 * (use emailButton / emailInfoRows / escaped strings to build it).
 */
export function renderBrandedEmail(opts: {
  brand: EmailBrand
  title: string
  heading: string
  bodyHtml: string
  preheader?: string
}): string {
  const { brand, title, heading, bodyHtml, preheader } = opts
  const tel = telHref(brand.phone)
  const year = new Date().getFullYear()
  const host = brand.siteUrl.replace(/^https?:\/\//, '')

  const logoBlock = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.businessName)}" height="44" style="height:44px;width:auto;border:0;display:block;margin:0 auto;">`
    : `<div style="font-family:${FONT};font-size:22px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;">911 <span style="color:${RED};">Construction &amp; Electric</span></div>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f5f7;font-size:1px;line-height:1px;">${escapeHtml(preheader || heading)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:${NAVY};padding:9px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${FONT};font-size:12px;color:#cbd5e1;">Licensed &amp; Insured — Lic. #${escapeHtml(brand.licenseNumber)}</td>
            <td align="right"><a href="${tel}" style="font-family:${FONT};font-size:12px;font-weight:600;color:${AMBER};text-decoration:none;">${escapeHtml(brand.phone)}</a></td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="background:#ffffff;padding:22px 24px;border-bottom:3px solid ${RED};">${logoBlock}</td></tr>
        <tr><td style="padding:30px 28px;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK};">
          <h1 style="margin:0 0 18px;font-family:${FONT};font-size:21px;line-height:1.3;font-weight:800;color:${NAVY};">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:${NAVY};padding:22px 28px;font-family:${FONT};font-size:12px;line-height:1.7;color:#94a3b8;">
          <strong style="color:#ffffff;font-size:13px;">${escapeHtml(brand.businessName)}</strong><br>
          CA Lic. #${escapeHtml(brand.licenseNumber)}${brand.addressLine ? ` &nbsp;·&nbsp; ${escapeHtml(brand.addressLine)}` : ''}<br>
          <a href="${tel}" style="color:${AMBER};text-decoration:none;">${escapeHtml(brand.phone)}</a> &nbsp;·&nbsp; <a href="${escapeHtml(brand.siteUrl)}" style="color:${AMBER};text-decoration:none;">${escapeHtml(host)}</a>
          <div style="margin-top:10px;color:${MUTED};">© ${year} ${escapeHtml(brand.businessName)}. All rights reserved.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
