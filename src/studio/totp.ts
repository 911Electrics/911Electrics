import 'server-only'

import crypto from 'crypto'

/**
 * Hand-rolled TOTP (RFC 6238) for Studio two-factor auth.
 *
 * Uses HMAC-SHA1, 6 digits, 30-second steps — the defaults every authenticator
 * app (Google Authenticator, 1Password, Authy, …) expects. No external runtime
 * dependency for the algorithm; `qrcode` is only used to render the enrolment QR.
 */

const DIGITS = 6
const PERIOD = 30
const ALGORITHM = 'SHA1'
const ISSUER = '911 Electrics Studio'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Encode bytes to RFC 4648 base32 (no padding). */
function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return out
}

/** Decode an RFC 4648 base32 string (case-insensitive, ignores spaces/padding). */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Generate a new random base32 secret (20 bytes / 160 bits). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

/** Compute the TOTP code for a secret at a given counter step. */
function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  // 64-bit big-endian counter (JS bitops are 32-bit, so split hi/lo)
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (binCode % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

/**
 * Verify a user-supplied code against the secret, allowing ±1 step of clock
 * drift (so a code is valid for roughly 90 seconds). Constant-ish time compare.
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const cleaned = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleaned)) return false
  const counter = Math.floor(Date.now() / 1000 / PERIOD)
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secret, counter + i)
    if (
      expected.length === cleaned.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))
    ) {
      return true
    }
  }
  return false
}

/** Build the otpauth:// URI an authenticator app scans. */
export function buildOtpAuthUri(secret: string, accountLabel: string): string {
  const label = encodeURIComponent(`${ISSUER}:${accountLabel}`)
  const params = new URLSearchParams({
    secret,
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: String(DIGITS),
    period: String(PERIOD),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** Group a base32 secret into 4-char blocks for easier manual entry. */
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}

const RECOVERY_COUNT = 10

/** Generate recovery codes (plaintext to show once) + their sha256 hashes to store. */
export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < RECOVERY_COUNT; i++) {
    // 10 hex chars, formatted xxxxx-xxxxx
    const raw = crypto.randomBytes(5).toString('hex')
    const code = `${raw.slice(0, 5)}-${raw.slice(5)}`
    plain.push(code)
    hashed.push(hashRecoveryCode(code))
  }
  return { plain, hashed }
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.toLowerCase().replace(/\s+/g, '')).digest('hex')
}

/**
 * Check a supplied recovery code against the stored hashes. Returns the
 * remaining hashes (with the used one removed) if it matched, else null.
 */
export function consumeRecoveryCode(stored: string[], supplied: string): string[] | null {
  const hash = hashRecoveryCode(supplied)
  const idx = stored.findIndex((h) => h.length === hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash)))
  if (idx === -1) return null
  return stored.filter((_, i) => i !== idx)
}
