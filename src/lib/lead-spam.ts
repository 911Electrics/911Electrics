/**
 * Pure spam-scoring for the public lead form, extracted so it can be unit
 * tested. The server action wires in IP counts, honeypot, timing and the
 * Turnstile result; this decides whether a submission looks like spam.
 *
 * Important: a non-null reason means "save as spam (recoverable)", NOT "drop".
 * Only a hard flood is dropped (see isHardFlood). Real submissions must never
 * vanish — validation errors are surfaced to the user separately.
 */

export const MIN_FILL_MS = 2000
export const HARD_FLOOD_PER_HOUR = 25
export const BURST_PER_10_MIN = 5
export const BURST_PER_HOUR = 12

export type SubmissionCounts = { tenMin: number; hour: number }

/** A genuine flood from one IP — the only case we hard-drop. */
export function isHardFlood(counts: SubmissionCounts): boolean {
  return counts.hour >= HARD_FLOOD_PER_HOUR
}

export type SpamSignals = {
  honeypot: string | null
  startedAt: number
  now: number
  counts: SubmissionCounts
}

/**
 * Heuristic spam reason (honeypot / too-fast / per-IP burst), or null. The
 * Turnstile check is handled by the caller so it's only run when needed.
 */
export function scoreSpamHeuristics({
  honeypot,
  startedAt,
  now,
  counts,
}: SpamSignals): string | null {
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return 'Hidden honeypot field was filled'
  }
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) {
    return 'Submitted faster than a person could fill the form'
  }
  if (counts.tenMin >= BURST_PER_10_MIN || counts.hour >= BURST_PER_HOUR) {
    return 'Many submissions from this IP in a short time'
  }
  return null
}

/**
 * Why a lead was flagged, and which kind of flag it is.
 *
 * - `heuristic`: honeypot filled, submitted too fast, or a per-IP burst. These
 *   are near-certain bots: saved as spam with no notifications at all.
 * - `challenge`: the Cloudflare Turnstile bot challenge was missing or failed.
 *   Real customers do fail it (old browsers, privacy extensions, flaky mobile
 *   networks), so the lead is still saved as spam (Studio keeps it separate)
 *   but the owner gets a clearly marked "POSSIBLE SPAM" alert email.
 */
export type SpamFlag = { kind: 'heuristic' | 'challenge' | 'content'; reason: string }

export type TurnstileResult =
  | { ok: true }
  | {
      ok: false
      reason: string
      /** reject without saving (vs. save as possible spam) */ reject: boolean
    }

/** Hostnames a Turnstile token may have been issued on. */
export const TURNSTILE_ALLOWED_HOSTNAMES = ['911electrics.com', 'www.911electrics.com']
export const TURNSTILE_ACTION = 'lead'
export const TURNSTILE_MAX_TOKEN_LENGTH = 2048

export type SiteverifyResponse = {
  success?: boolean
  'error-codes'?: string[]
  hostname?: string
  action?: string
}

/**
 * Pure interpretation of a Turnstile check. `response` is the parsed siteverify
 * JSON, or `'fetch-error'` if Cloudflare could not be reached.
 *
 * A missing, malformed or failed token is rejected outright (never saved): a
 * real browser always gets a token from the invisible widget, and the form asks
 * the visitor to retry or call. Only a Cloudflare outage (fetch error) is
 * borderline: saved as spam with a POSSIBLE SPAM owner alert so a real customer
 * is never lost.
 */
export function turnstileOutcome(opts: {
  secretConfigured: boolean
  token: string | undefined | null
  response?: SiteverifyResponse | 'fetch-error'
  allowedHostnames?: string[]
  expectedAction?: string
}): TurnstileResult {
  // Not configured: honeypot + time trap still apply.
  if (!opts.secretConfigured) return { ok: true }
  if (!opts.token) {
    return { ok: false, reject: true, reason: 'Bot challenge (Turnstile) token was missing' }
  }
  if (opts.token.length > TURNSTILE_MAX_TOKEN_LENGTH) {
    return { ok: false, reject: true, reason: 'Bot challenge (Turnstile) token was malformed' }
  }
  if (!opts.response || opts.response === 'fetch-error') {
    return {
      ok: false,
      reject: false,
      reason: 'Bot challenge (Turnstile) could not be verified (Cloudflare unreachable)',
    }
  }
  if (!opts.response.success) {
    const codes = (opts.response['error-codes'] ?? []).filter(Boolean)
    return {
      ok: false,
      reject: true,
      reason: `Did not pass the bot challenge (Turnstile${codes.length ? `: ${codes.join(', ')}` : ''})`,
    }
  }
  const hosts = opts.allowedHostnames
  if (hosts && opts.response.hostname && !hosts.includes(opts.response.hostname)) {
    return {
      ok: false,
      reject: true,
      reason: `Bot challenge (Turnstile) token was issued for another site (${opts.response.hostname})`,
    }
  }
  if (opts.expectedAction && opts.response.action && opts.response.action !== opts.expectedAction) {
    return { ok: false, reject: true, reason: 'Bot challenge (Turnstile) action mismatch' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Content flags: the service area is Southern California. These are saved as
// spam (recoverable) with no notification at all.
// ---------------------------------------------------------------------------

export type LeadContent = {
  name: string
  phone?: string
  email?: string
  address?: string
  message?: string
  userAgent?: string
}

const NON_CA_STATES: Record<string, string> = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CO: 'colorado',
  CT: 'connecticut',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  HI: 'hawaii',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  IA: 'iowa',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  ME: 'maine',
  MD: 'maryland',
  MA: 'massachusetts',
  MI: 'michigan',
  MN: 'minnesota',
  MS: 'mississippi',
  MO: 'missouri',
  MT: 'montana',
  NE: 'nebraska',
  NV: 'nevada',
  NH: 'new hampshire',
  NJ: 'new jersey',
  NM: 'new mexico',
  NY: 'new york',
  NC: 'north carolina',
  ND: 'north dakota',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  RI: 'rhode island',
  SC: 'south carolina',
  SD: 'south dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VT: 'vermont',
  VA: 'virginia',
  WA: 'washington',
  WV: 'west virginia',
  WI: 'wisconsin',
  WY: 'wyoming',
  DC: 'district of columbia',
}

/** Spam/SEO/outsourcing pitches seen in the inbox. */
const SPAM_PITCH =
  /\b(estimat(ion|ing) services?|cost estimat(ion|ing)|(quantity|material)? ?take-?offs?|seo\b|search engine optimi[sz]ation|backlinks?|guest post|link building|web ?design(ing)? (services?|agency|company)|website redesign|lead generation|google (ranking|first page)|first page of google|digital marketing|social media marketing|virtual assistant|bookkeeping services?|crypto|bitcoin|casino|viagra|loan offer)\b/i

const SPAM_DOMAINS = [
  'highqestimation.com',
  'highqestimation',
  '-estimation.com',
  'estimatingllc',
  'estimating.com',
  'semrush-partner',
  'seo-',
  'backlink',
  'linkbuilding',
]

/**
 * The ZIP at the end of an address ("91402", "Glendale, CA 91203"), if any.
 * A 5-digit house number at the start ("10209 Parr Avenue") is not a ZIP.
 */
export function extractZip(address: string | undefined): string | null {
  if (!address) return null
  const m = address
    .trim()
    .match(/(?:^|[\s,])(\d{5})(?:-\d{4})?\s*(?:,?\s*(?:usa|us|united states)\.?)?\s*$/i)
  return m ? m[1] : null
}

export function isCaZip(zip: string): boolean {
  const n = Number(zip)
  return n >= 90000 && n <= 96199
}

/** A non-CA state named in the address (next to a ZIP, or as the last part after a comma). */
export function nonCaState(address: string | undefined): string | null {
  if (!address) return null
  const a = address.trim()
  // "..., NY 10001" / "... NY 10001" / "..., NY"
  const abbr = a.match(
    /(?:,|\s)\s*([A-Za-z]{2})\.?\s*(?:\d{5}(?:-\d{4})?)?\s*(?:,?\s*(?:usa|us|united states))?\s*$/i,
  )
  if (abbr) {
    const code = abbr[1].toUpperCase()
    // Only trust a 2-letter token when it is uppercase in the input, after a comma, or before a ZIP.
    const ctx = abbr[0]
    // "LA" is how locals write Los Angeles, never Louisiana here.
    const strong =
      code !== 'LA' && (/\d{5}/.test(ctx) || (ctx.trim().startsWith(',') && abbr[1] === code))
    if (strong && NON_CA_STATES[code]) return code
  }
  const lower = a.toLowerCase().replace(/\s*,?\s*(usa|us|united states)\s*$/, '')
  for (const [code, name] of Object.entries(NON_CA_STATES)) {
    const re = new RegExp(
      `(?:,\\s*${name}(?:\\s+\\d{5}(?:-\\d{4})?)?|\\b${name}\\s+\\d{5}(?:-\\d{4})?)\\s*$`,
    )
    if (re.test(lower)) return code
  }
  return null
}

/** Random-looking letter string, e.g. "Vqxm Prlqywj". Weak signal only. */
export function looksRandomName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return false
  let odd = 0
  for (const w of words) {
    const l = w.toLowerCase().replace(/[^a-z]/g, '')
    if (l.length < 3) continue
    const vowels = (l.match(/[aeiouy]/g) ?? []).length
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(l) || /q(?!u)/.test(l) || vowels / l.length < 0.2) odd++
  }
  return odd > 0 && odd >= Math.ceil(words.length / 2)
}

/** Message that is nothing but a phone number. Weak signal only. */
export function isPhoneOnlyMessage(message: string | undefined): boolean {
  if (!message) return false
  const m = message.trim()
  return m.length > 0 && /^[\d\s()+.-]+$/.test(m) && (m.match(/\d/g) ?? []).length >= 7
}

/**
 * Content-based spam reason, or null. Strong signals flag alone; weak signals
 * (random-looking name, phone-only message) only together with another signal,
 * so an unusual real name never sends a customer to spam on its own.
 */
export function scoreSpamContent(c: LeadContent): string | null {
  const strong: string[] = []
  const weak: string[] = []
  const zip = extractZip(c.address)
  if (zip && !isCaZip(zip)) strong.push(`ZIP ${zip} is outside California`)
  const st = nonCaState(c.address)
  if (st) strong.push(`address is in ${st}, outside California`)
  const ua = c.userAgent?.trim()
  if (ua && /^["']/.test(ua)) strong.push('malformed user agent (starts with a quote)')
  const text = `${c.name} ${c.email ?? ''} ${c.message ?? ''} ${c.address ?? ''}`
  if (SPAM_PITCH.test(text)) strong.push('sales/SEO pitch, not a service request')
  const lowerText = `${c.email ?? ''} ${c.message ?? ''}`.toLowerCase()
  const dom = SPAM_DOMAINS.find((d) => lowerText.includes(d))
  if (dom) strong.push(`known spam domain (${dom})`)
  if (looksRandomName(c.name)) weak.push('random-looking name')
  if (isPhoneOnlyMessage(c.message)) weak.push('message is only a phone number')

  if (strong.length) return [...strong, ...weak].join('; ')
  if (weak.length >= 2) return weak.join('; ')
  return null
}

export type LeadNotificationPlan = {
  /** Internal alert email to the owner (LEAD_NOTIFICATION_EMAIL). */
  ownerAlert: boolean
  /** Mark the owner alert "POSSIBLE SPAM" with the reason. */
  possibleSpam: boolean
  customerAutoReply: boolean
  ownerSms: boolean
}

/** Which notifications a newly saved lead gets, based on its spam flag. */
export function leadNotificationPlan(flag: SpamFlag | null): LeadNotificationPlan {
  if (!flag)
    return { ownerAlert: true, possibleSpam: false, customerAutoReply: true, ownerSms: true }
  // 'content' and 'heuristic': saved as spam with no notifications at all.
  if (flag.kind === 'challenge') {
    return { ownerAlert: true, possibleSpam: true, customerAutoReply: false, ownerSms: false }
  }
  return { ownerAlert: false, possibleSpam: false, customerAutoReply: false, ownerSms: false }
}
