import { describe, expect, it } from 'vitest'

import { BUSINESS_TZ, utcToZonedInput, zonedInputToUtc } from '@/lib/business-time'

const iso = (naive: string, tz?: string) => zonedInputToUtc(naive, tz)?.toISOString() ?? null

describe('zonedInputToUtc', () => {
  it('reads a naive time as Pacific, not as the server zone', () => {
    // The bug: on a UTC server `new Date("2026-09-21T09:00")` is 09:00Z — 2 AM Pacific.
    expect(iso('2026-09-21T09:00')).toBe('2026-09-21T16:00:00.000Z') // PDT, UTC-7
    expect(iso('2026-12-15T09:00')).toBe('2026-12-15T17:00:00.000Z') // PST, UTC-8
  })

  it('defaults to the business timezone', () => {
    expect(BUSINESS_TZ).toBe('America/Los_Angeles')
    expect(iso('2026-07-04T12:00')).toBe(iso('2026-07-04T12:00', 'America/Los_Angeles'))
  })

  it('crosses the date line correctly for evening times', () => {
    expect(iso('2026-09-21T20:30')).toBe('2026-09-22T03:30:00.000Z')
  })

  it('handles the day DST starts and the day it ends', () => {
    // 2026-03-08: clocks go 01:59 PST -> 03:00 PDT.
    expect(iso('2026-03-08T01:30')).toBe('2026-03-08T09:30:00.000Z') // still PST
    expect(iso('2026-03-08T03:30')).toBe('2026-03-08T10:30:00.000Z') // now PDT
    // 02:30 does not exist that day; a wall clock would have read 03:30.
    expect(iso('2026-03-08T02:30')).toBe('2026-03-08T10:30:00.000Z')
    // 2026-11-01: clocks go 01:59 PDT -> 01:00 PST. 01:30 happens twice; take the first.
    expect(iso('2026-11-01T01:30')).toBe('2026-11-01T08:30:00.000Z')
    expect(iso('2026-11-01T03:00')).toBe('2026-11-01T11:00:00.000Z') // PST
  })

  it('accepts seconds and surrounding whitespace', () => {
    expect(iso(' 2026-09-21T09:00:30 ')).toBe('2026-09-21T16:00:30.000Z')
  })

  it('rejects anything that is not a real naive date-time', () => {
    for (const bad of ['', 'tomorrow', '2026-09-21', '2026-09-21T09:00Z', '2026-02-31T09:00', '2026-09-21T25:00', '2026-13-01T00:00']) {
      expect(zonedInputToUtc(bad)).toBeNull()
    }
  })

  it('works for other zones', () => {
    expect(iso('2026-09-21T09:00', 'America/New_York')).toBe('2026-09-21T13:00:00.000Z')
    expect(iso('2026-09-21T09:00', 'UTC')).toBe('2026-09-21T09:00:00.000Z')
  })
})

describe('utcToZonedInput', () => {
  it('formats an instant as Pacific wall time', () => {
    expect(utcToZonedInput('2026-09-21T16:00:00.000Z')).toBe('2026-09-21T09:00')
    expect(utcToZonedInput('2026-12-15T17:00:00.000Z')).toBe('2026-12-15T09:00')
    expect(utcToZonedInput('2026-09-22T03:30:00.000Z')).toBe('2026-09-21T20:30')
  })

  it('uses 00 for midnight, never 24', () => {
    expect(utcToZonedInput('2026-09-21T07:00:00.000Z')).toBe('2026-09-21T00:00')
  })

  it('returns "" for empty or invalid input', () => {
    expect(utcToZonedInput(null)).toBe('')
    expect(utcToZonedInput('')).toBe('')
    expect(utcToZonedInput('not a date')).toBe('')
  })

  it('round-trips with zonedInputToUtc across the year', () => {
    for (const naive of ['2026-01-01T00:00', '2026-03-08T03:30', '2026-06-30T23:59', '2026-11-01T03:00', '2026-12-31T12:15']) {
      expect(utcToZonedInput(zonedInputToUtc(naive))).toBe(naive)
    }
  })
})
