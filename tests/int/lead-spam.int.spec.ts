import { describe, expect, it } from 'vitest'

import {
  BURST_PER_10_MIN,
  HARD_FLOOD_PER_HOUR,
  MIN_FILL_MS,
  isHardFlood,
  scoreSpamHeuristics,
} from '@/lib/lead-spam'

const NOW = 1_000_000_000_000
const noCounts = { tenMin: 0, hour: 0 }
const human = { honeypot: null, startedAt: NOW - 30_000, now: NOW, counts: noCounts }

describe('isHardFlood', () => {
  it('flags only at/above the hourly flood threshold', () => {
    expect(isHardFlood({ tenMin: 0, hour: HARD_FLOOD_PER_HOUR - 1 })).toBe(false)
    expect(isHardFlood({ tenMin: 0, hour: HARD_FLOOD_PER_HOUR })).toBe(true)
  })
})

describe('scoreSpamHeuristics', () => {
  it('passes a normal human submission', () => {
    expect(scoreSpamHeuristics(human)).toBeNull()
  })

  it('flags a filled honeypot', () => {
    expect(scoreSpamHeuristics({ ...human, honeypot: 'http://spam' })).toMatch(/honeypot/i)
  })

  it('flags a submission faster than MIN_FILL_MS', () => {
    expect(scoreSpamHeuristics({ ...human, startedAt: NOW - (MIN_FILL_MS - 1) })).toMatch(/faster/i)
  })

  it('does not flag a submission just over MIN_FILL_MS', () => {
    expect(scoreSpamHeuristics({ ...human, startedAt: NOW - (MIN_FILL_MS + 10) })).toBeNull()
  })

  it('flags a missing/NaN startedAt (bot posting directly)', () => {
    expect(scoreSpamHeuristics({ ...human, startedAt: NaN })).toMatch(/faster/i)
  })

  it('flags a per-IP burst', () => {
    expect(scoreSpamHeuristics({ ...human, counts: { tenMin: BURST_PER_10_MIN, hour: 5 } })).toMatch(/many/i)
  })

  it('returns a recoverable reason (string), never throws — leads are saved as spam, not dropped', () => {
    const reason = scoreSpamHeuristics({ ...human, honeypot: 'x' })
    expect(typeof reason).toBe('string')
  })
})
