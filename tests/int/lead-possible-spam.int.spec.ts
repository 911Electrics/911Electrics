import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildLeadAlertEmail } from '@/lib/lead-alert-email'
import { defaultBrand } from '@/lib/email-template'
import { leadNotificationPlan, turnstileOutcome } from '@/lib/lead-spam'

// ---- Mocks for the server action's dependencies ----
const sent: { subject: string; html: string; text: string; to: string }[] = []
const queries: { sql: string; params?: unknown[] }[] = []
const autoReply = vi.fn(async () => ({ ok: true as const }))
const ownerSms = vi.fn(async () => ({ ok: true as const }))
let headerMap: Record<string, string> = {}

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => headerMap[k.toLowerCase()] ?? null }),
}))
vi.mock('@/db/client', () => ({
  query: vi.fn(async (sql: string, params?: unknown[]) => {
    queries.push({ sql, params })
    if (sql.includes('count(*) FILTER')) return [{ ten_min: '0', hour: '0' }]
    if (sql.includes('INSERT INTO leads')) return [{ id: 4242 }]
    return []
  }),
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (m: { subject: string; html: string; text: string; to: string }) => {
        sent.push(m)
        return { error: null }
      },
    }
  },
}))
vi.mock('@/lib/notify', () => ({
  sendCustomerAutoReply: (...a: unknown[]) => autoReply(...(a as [])),
  sendOwnerSms: (...a: unknown[]) => ownerSms(...(a as [])),
}))
vi.mock('@/lib/queries', () => ({
  getSiteSettings: async () => ({
    businessName: '911 Construction & Electric Inc.',
    licenseNumber: '1027421',
    phone: '747-255-8595',
    email: 'info@911electrics.com',
    logo: null,
    address: null,
  }),
}))

const { submitLead } = await import('@/app/actions/submit-lead')

function form(extra: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const fields: Record<string, string> = {
    name: 'Jane Customer',
    phone: '626-555-0100',
    email: 'jane@example.com',
    service: 'EV Charger',
    message: 'Need a charger',
    sourcePath: '/contact/',
    formLocation: 'contact-page',
    startedAt: String(Date.now() - 30_000),
    hp_ref_x: '',
    ...extra,
  }
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const leadStatus = () =>
  queries
    .find((q) => q.sql.includes('INSERT INTO leads'))
    ?.sql.match(/'(\w+)'::enum_leads_status/)?.[1]
const activity = () =>
  queries.filter((q) => q.sql.includes('lead_activity')).map((q) => String(q.params?.[1]))

describe('turnstileOutcome', () => {
  it('passes when Turnstile is not configured', () => {
    expect(turnstileOutcome({ secretConfigured: false, token: undefined })).toEqual({ ok: true })
  })
  it('flags a missing token', () => {
    const r = turnstileOutcome({ secretConfigured: true, token: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/missing/i)
  })
  it('flags a failed challenge with the error codes', () => {
    const r = turnstileOutcome({
      secretConfigured: true,
      token: 't',
      response: { success: false, 'error-codes': ['timeout-or-duplicate'] },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/timeout-or-duplicate/)
  })
  it('rejects missing/failed tokens; a Cloudflare outage is borderline (saved, not rejected)', () => {
    expect(turnstileOutcome({ secretConfigured: true, token: '' })).toMatchObject({
      ok: false,
      reject: true,
    })
    expect(
      turnstileOutcome({ secretConfigured: true, token: 't', response: { success: false } }),
    ).toMatchObject({ ok: false, reject: true })
    expect(
      turnstileOutcome({ secretConfigured: true, token: 't', response: 'fetch-error' }),
    ).toMatchObject({ ok: false, reject: false })
    expect(turnstileOutcome({ secretConfigured: true, token: 'x'.repeat(2049) })).toMatchObject({
      ok: false,
      reject: true,
    })
  })
  it('checks hostname and action', () => {
    const base = {
      secretConfigured: true,
      token: 't',
      allowedHostnames: ['911electrics.com'],
      expectedAction: 'lead',
    }
    expect(
      turnstileOutcome({
        ...base,
        response: { success: true, hostname: '911electrics.com', action: 'lead' },
      }).ok,
    ).toBe(true)
    expect(
      turnstileOutcome({
        ...base,
        response: { success: true, hostname: 'evil.com', action: 'lead' },
      }),
    ).toMatchObject({ ok: false, reject: true })
    expect(
      turnstileOutcome({
        ...base,
        response: { success: true, hostname: '911electrics.com', action: 'x' },
      }),
    ).toMatchObject({ ok: false, reject: true })
  })
  it('passes on success', () => {
    expect(
      turnstileOutcome({ secretConfigured: true, token: 't', response: { success: true } }).ok,
    ).toBe(true)
  })
})

describe('leadNotificationPlan', () => {
  it('clean lead gets everything', () => {
    expect(leadNotificationPlan(null)).toEqual({
      ownerAlert: true,
      possibleSpam: false,
      customerAutoReply: true,
      ownerSms: true,
    })
  })
  it('bot-challenge flag: owner alert marked possible spam, nothing to the customer', () => {
    expect(leadNotificationPlan({ kind: 'challenge', reason: 'x' })).toEqual({
      ownerAlert: true,
      possibleSpam: true,
      customerAutoReply: false,
      ownerSms: false,
    })
  })
  it('heuristic flag (honeypot etc.): no notifications', () => {
    expect(leadNotificationPlan({ kind: 'heuristic', reason: 'x' })).toEqual({
      ownerAlert: false,
      possibleSpam: false,
      customerAutoReply: false,
      ownerSms: false,
    })
  })
})

describe('buildLeadAlertEmail', () => {
  const data = { name: 'Jane <b>', phone: '626-555-0100', service: 'EV Charger' }
  it('normal alert keeps the old subject', () => {
    const m = buildLeadAlertEmail({ brand: defaultBrand(), leadId: 1, data })
    expect(m.subject).toBe('New lead: Jane <b> — EV Charger')
    expect(m.html).not.toMatch(/POSSIBLE SPAM/)
    expect(m.text).not.toMatch(/POSSIBLE SPAM/)
  })
  it('possible-spam alert is marked in subject, html and text with the reason (escaped)', () => {
    const m = buildLeadAlertEmail({
      brand: defaultBrand(),
      leadId: 1,
      data,
      possibleSpamReason: 'Bot challenge <token> was missing',
    })
    expect(m.subject).toBe('POSSIBLE SPAM — New lead: Jane <b> — EV Charger')
    expect(m.html).toMatch(/POSSIBLE SPAM/)
    expect(m.html).toContain('Bot challenge &lt;token&gt; was missing')
    expect(m.html).not.toContain('<b>')
    expect(m.text.startsWith('POSSIBLE SPAM\nReason: Bot challenge <token> was missing')).toBe(true)
  })
})

describe('submitLead notifications', () => {
  beforeEach(() => {
    sent.length = 0
    queries.length = 0
    autoReply.mockClear()
    ownerSms.mockClear()
    headerMap = { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'test' }
    process.env.RESEND_API_KEY = 're_test'
    process.env.LEAD_NOTIFICATION_EMAIL = 'info@911electrics.com'
    delete process.env.TURNSTILE_SECRET_KEY
    vi.unstubAllGlobals()
  })

  it('clean lead (Turnstile not configured): new, normal alert, auto-reply + SMS', async () => {
    const r = await submitLead({ status: 'idle' }, form())
    expect(r.status).toBe('success')
    expect(leadStatus()).toBe('new')
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toBe('New lead: Jane Customer — EV Charger')
    expect(autoReply).toHaveBeenCalledTimes(1)
    expect(ownerSms).toHaveBeenCalledTimes(1)
  })

  it('missing Turnstile token: rejected, not saved, no email', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    const r = await submitLead({ status: 'idle' }, form())
    expect(r.status).toBe('error')
    expect(queries.some((q) => q.sql.includes('INSERT INTO leads'))).toBe(false)
    expect(sent).toHaveLength(0)
  })

  it('failed Turnstile challenge: rejected, not saved', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      })),
    )
    const r = await submitLead({ status: 'idle' }, form({ 'cf-turnstile-response': 'bad' }))
    expect(r.status).toBe('error')
    expect(queries.some((q) => q.sql.includes('INSERT INTO leads'))).toBe(false)
    expect(sent).toHaveLength(0)
  })

  it('Cloudflare unreachable: saved as spam with POSSIBLE SPAM alert only', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down')
      }),
    )
    const r = await submitLead({ status: 'idle' }, form({ 'cf-turnstile-response': 'tok' }))
    expect(r.status).toBe('success')
    expect(leadStatus()).toBe('spam')
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toMatch(/^POSSIBLE SPAM/)
    expect(autoReply).not.toHaveBeenCalled()
    expect(ownerSms).not.toHaveBeenCalled()
  })

  it('out-of-state address: saved as spam, no email at all', async () => {
    const r = await submitLead(
      { status: 'idle' },
      form({ address: '519 8th Ave, New York, NY 10018' }),
    )
    expect(r.status).toBe('success')
    expect(leadStatus()).toBe('spam')
    expect(sent).toHaveLength(0)
    expect(autoReply).not.toHaveBeenCalled()
    expect(ownerSms).not.toHaveBeenCalled()
    expect(activity().some((a) => /outside California/.test(a))).toBe(true)
  })

  it('quote-prefixed user agent: saved as spam, no email', async () => {
    headerMap['user-agent'] = '"Mozilla/5.0 (Windows NT 10.0)'
    await submitLead({ status: 'idle' }, form({ address: '91537' }))
    expect(leadStatus()).toBe('spam')
    expect(sent).toHaveLength(0)
  })

  it('real CA lead with a passed challenge stays new with the normal alert', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ success: true, hostname: 'www.911electrics.com', action: 'lead' }),
      })),
    )
    await submitLead(
      { status: 'idle' },
      form({ 'cf-turnstile-response': 'ok', address: '123 Brand Blvd, Glendale, CA 91203' }),
    )
    expect(leadStatus()).toBe('new')
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).not.toMatch(/POSSIBLE SPAM/)
  })

  it('passed Turnstile challenge: normal lead', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ success: true }) })),
    )
    await submitLead({ status: 'idle' }, form({ 'cf-turnstile-response': 'ok' }))
    expect(leadStatus()).toBe('new')
    expect(sent[0].subject).not.toMatch(/POSSIBLE SPAM/)
    expect(autoReply).toHaveBeenCalledTimes(1)
  })

  it('honeypot (hp_ref_x) filled: saved as spam, no email at all', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    await submitLead({ status: 'idle' }, form({ hp_ref_x: 'Acme Inc' }))
    expect(leadStatus()).toBe('spam')
    expect(sent).toHaveLength(0)
    expect(autoReply).not.toHaveBeenCalled()
    expect(ownerSms).not.toHaveBeenCalled()
  })

  it('too-fast submission: saved as spam, no email', async () => {
    await submitLead({ status: 'idle' }, form({ startedAt: String(Date.now()) }))
    expect(leadStatus()).toBe('spam')
    expect(sent).toHaveLength(0)
  })
})
