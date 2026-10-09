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
export function scoreSpamHeuristics({ honeypot, startedAt, now, counts }: SpamSignals): string | null {
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
