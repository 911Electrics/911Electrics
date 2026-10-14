import { describe, expect, it } from 'vitest'

import {
  extractZip,
  isCaZip,
  isPhoneOnlyMessage,
  looksRandomName,
  nonCaState,
  scoreSpamContent,
} from '@/lib/lead-spam'

describe('scoreSpamContent — real Southern California leads pass', () => {
  const real = [
    { name: 'Jane Customer', address: '123 Brand Blvd, Glendale, CA 91203' },
    { name: 'Armen Mkrtchyan', address: 'Van Nuys' },
    { name: 'Hovik Ghazaryan', address: '91402', message: 'Panel keeps tripping' },
    { name: 'Lisa Ng', address: '5500 Washington Blvd, Culver City' },
    { name: 'Tom', address: '1200 Oregon Ave, Long Beach, CA 90813' },
    { name: 'Maria Lopez', address: 'Burbank or Glendale', message: '818 555 1234' },
    { name: 'Sam Lee', address: '5th St, LA 90013' },
    { name: 'Ana', address: '' },
    { name: 'Zachary Fitzgerald', address: '10209 Parr Avenue' },
    { name: 'Joe Smith', address: '96150 South Lake Tahoe' },
    { name: 'Joe Smith', message: 'Need an SEO? no — need EV charger', address: 'Encino' },
  ]
  for (const c of real.slice(0, 10)) {
    it(`${c.name} / ${c.address}`, () => {
      expect(scoreSpamContent({ ...c, userAgent: 'Mozilla/5.0' })).toBeNull()
    })
  }
})

describe('scoreSpamContent — spam is flagged', () => {
  it('non-CA ZIP', () =>
    expect(scoreSpamContent({ name: 'Vqxm Prlqywj', address: '65300' })).toMatch(/65300/))
  it('NY address with pitch (lead 155)', () =>
    expect(
      scoreSpamContent({
        name: 'James Cooper',
        address: '519 8TH AVE, 7TH FLOOR NEW YORK, NY 10018',
        message: 'High Q Estimation provides professional cost estimating services',
      }),
    ).toMatch(/outside California/))
  it('state name at the end', () =>
    expect(scoreSpamContent({ name: 'Bob', address: 'Austin, Texas' })).toMatch(/TX/))
  it('quote-prefixed UA even with CA ZIP', () =>
    expect(
      scoreSpamContent({ name: 'Ofoqbid Laojxc', address: '91537', userAgent: '"Mozilla/5.0' }),
    ).toMatch(/user agent/))
  it('SEO pitch', () =>
    expect(
      scoreSpamContent({
        name: 'Mark',
        message: 'We can get you on the first page of Google with backlinks',
      }),
    ).not.toBeNull())
  it('random name + phone-only message', () =>
    expect(scoreSpamContent({ name: 'Vqxm Prlqywj', message: '(213) 555-0199' })).toMatch(/random/))
  it('random name alone is not enough', () =>
    expect(scoreSpamContent({ name: 'Vqxm Prlqywj' })).toBeNull())
})

describe('helpers', () => {
  it('extractZip takes the last ZIP', () =>
    expect(extractZip('12345 Main St, Glendale CA 91203')).toBe('91203'))
  it('CA ZIP range', () => {
    expect(isCaZip('90000')).toBe(true)
    expect(isCaZip('96199')).toBe(true)
    expect(isCaZip('96200')).toBe(false)
    expect(isCaZip('89999')).toBe(false)
  })
  it('nonCaState ignores LA and CA', () => {
    expect(nonCaState('Hollywood, LA')).toBeNull()
    expect(nonCaState('Pasadena, CA 91101')).toBeNull()
    expect(nonCaState('Miami, FL 33101')).toBe('FL')
  })
  it('looksRandomName', () => {
    expect(looksRandomName('Vqxm Prlqywj')).toBe(true)
    expect(looksRandomName('Jane Customer')).toBe(false)
  })
  it('isPhoneOnlyMessage', () => {
    expect(isPhoneOnlyMessage('818-555-1234')).toBe(true)
    expect(isPhoneOnlyMessage('call 818-555-1234')).toBe(false)
  })
})
