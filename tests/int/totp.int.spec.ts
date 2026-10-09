import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from '@/studio/totp'

// RFC 6238 test secret "12345678901234567890" in base32.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

afterEach(() => vi.restoreAllMocks())

describe('verifyTotp (RFC 6238 vectors)', () => {
  it('accepts the expected code at T=59s (counter 1 → 287082)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(59 * 1000)
    expect(verifyTotp(RFC_SECRET, '287082')).toBe(true)
  })

  it('rejects a wrong code', () => {
    vi.spyOn(Date, 'now').mockReturnValue(59 * 1000)
    expect(verifyTotp(RFC_SECRET, '000000')).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBe(false)
    expect(verifyTotp(RFC_SECRET, '12345')).toBe(false)
  })
})

describe('secret + recovery codes', () => {
  it('generates a non-trivial base32 secret', () => {
    const s = generateTotpSecret()
    expect(s).toMatch(/^[A-Z2-7]+$/)
    expect(s.length).toBeGreaterThanOrEqual(16)
  })

  it('hashes recovery codes deterministically and never stores plaintext', () => {
    const { plain, hashed } = generateRecoveryCodes()
    expect(plain).toHaveLength(hashed.length)
    expect(hashed).not.toContain(plain[0])
    expect(hashRecoveryCode(plain[0])).toBe(hashed[0])
  })

  it('consumes a valid recovery code once and rejects an invalid one', () => {
    const { plain, hashed } = generateRecoveryCodes()
    const remaining = consumeRecoveryCode(hashed, plain[0])
    expect(remaining).not.toBeNull()
    expect(remaining).toHaveLength(hashed.length - 1)
    expect(consumeRecoveryCode(hashed, 'not-a-code')).toBeNull()
  })
})
