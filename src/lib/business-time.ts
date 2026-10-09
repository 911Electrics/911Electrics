/**
 * Wall-clock times in Studio mean the business's timezone.
 *
 * A `<input type="datetime-local">` submits a naive string — "2026-09-21T09:00"
 * — with no zone. The actions used to hand that to `new Date()`, which reads it
 * in the *server's* zone. Vercel runs in UTC, so a post scheduled for 9:00 AM
 * went out at 2:00 AM Pacific, and a follow-up reminder set for 9:00 AM fired in
 * the middle of the night. (The lead form was subtler: it is rendered on the
 * server, so it displayed and parsed UTC consistently — and was consistently
 * seven or eight hours off from what the owner meant.)
 *
 * Fixing the zone rather than using the browser's makes "9:00" mean the same
 * instant whoever types it and wherever they are, and makes the server-rendered
 * and client-rendered value of a field identical, so it cannot cause a
 * hydration mismatch.
 *
 * Client-safe and dependency-free: `Intl` does the zone math, so DST is handled
 * by the platform's tz database rather than by arithmetic here.
 */

export const BUSINESS_TZ = 'America/Los_Angeles'
export const BUSINESS_TZ_LABEL = 'Pacific time'

const NAIVE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

function zonedParts(instant: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const get = (type: string) =>
    Number(fmt.formatToParts(instant).find((p) => p.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const asUtcMs = (p: Parts): number =>
  Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)

/** How far `timeZone`'s wall clock is ahead of UTC at `instant`, in ms. */
function offsetMs(instant: Date, timeZone: string): number {
  // Whole seconds only — the formatter has no milliseconds.
  const floored = new Date(Math.floor(instant.getTime() / 1000) * 1000)
  return asUtcMs(zonedParts(floored, timeZone)) - floored.getTime()
}

/**
 * Read a naive `datetime-local` value as a wall-clock time in `timeZone` and
 * return the instant it names. Returns null for anything that is not a valid
 * naive date-time.
 *
 * DST edges: a time that occurs twice (the fall-back hour) resolves to the
 * first, daylight-time occurrence; a time that does not exist (the spring-
 * forward hour) resolves to the instant an hour later, which is what a wall
 * clock would have shown.
 */
export function zonedInputToUtc(naive: string, timeZone: string = BUSINESS_TZ): Date | null {
  const m = NAIVE.exec(naive.trim())
  if (!m) return null
  const [year, month, day, hour, minute, second] = m.slice(1).map((v) => Number(v ?? 0))
  const wall = Date.UTC(year, month - 1, day, hour, minute, second || 0)
  // Reject overflow like 2026-02-31 or 25:00, which Date.UTC would roll over.
  const check = new Date(wall)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null
  }

  // The offset depends on the instant, which is what we are solving for, so
  // guess with the offset at the wall time, then correct with the offset at
  // that guess. The offset only changes at a DST transition, so two passes
  // settle it — except inside the spring-forward gap, where no instant has this
  // wall time and the second pass overshoots backwards to an hour *before* what
  // was typed. There, keep the first guess: it lands an hour later, which is
  // what the wall clock actually read.
  const guess = wall - offsetMs(new Date(wall), timeZone)
  const corrected = wall - offsetMs(new Date(guess), timeZone)
  const names = (ms: number) => asUtcMs(zonedParts(new Date(ms), timeZone)) === wall
  return new Date(names(corrected) ? corrected : names(guess) ? guess : Math.max(guess, corrected))
}

/** Format an instant as a `datetime-local` value in `timeZone` ("" if invalid). */
export function utcToZonedInput(
  iso: string | Date | null | undefined,
  timeZone: string = BUSINESS_TZ,
): string {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = zonedParts(d, timeZone)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}
