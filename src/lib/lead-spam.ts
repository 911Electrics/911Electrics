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
export type SpamFlag = { kind: 'heuristic' | 'challenge'; reason: string }

export type TurnstileResult = { ok: true } | { ok: false; reason: string }

/**
 * Pure interpretation of a Turnstile check. `response` is the parsed siteverify
 * JSON, or `'fetch-error'` if Cloudflare could not be reached.
 */
export function turnstileOutcome(opts: {
  secretConfigured: boolean
  token: string | undefined | null
  response?: { success?: boolean; 'error-codes'?: string[] } | 'fetch-error'
}): TurnstileResult {
  // Not configured: honeypot + time trap still apply.
  if (!opts.secretConfigured) return { ok: true }
  if (!opts.token) {
    return { ok: false, reason: 'Bot challenge (Turnstile) token was missing' }
  }
  // A Cloudflare outage shouldn't block real customers.
  if (!opts.response || opts.response === 'fetch-error') return { ok: true }
  if (opts.response.success) return { ok: true }
  const codes = (opts.response['error-codes'] ?? []).filter(Boolean)
  return {
    ok: false,
    reason: `Did not pass the bot challenge (Turnstile${codes.length ? `: ${codes.join(', ')}` : ''})`,
  }
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
  if (flag.kind === 'challenge') {
    return { ownerAlert: true, possibleSpam: true, customerAutoReply: false, ownerSms: false }
  }
  return { ownerAlert: false, possibleSpam: false, customerAutoReply: false, ownerSms: false }
}
