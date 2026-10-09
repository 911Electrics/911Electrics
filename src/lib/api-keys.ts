import crypto from 'crypto'

/**
 * Admin API keys — minting, parsing and hashing. Node-only (uses `crypto`);
 * scopes live in `api-scopes.ts` so client components can import them.
 *
 * A key looks like `e911_<prefix>_<secret>`:
 *   - `prefix` (8 hex chars) is stored in the clear and is how a key is looked
 *     up and recognised in the UI and the audit log;
 *   - the whole key is stored only as a SHA-256 hash. The secret is 32 random
 *     bytes, so a fast unsalted hash is appropriate — there is nothing to
 *     brute-force, and verification runs on every API request.
 * The full key is shown once, at creation, and cannot be recovered afterwards.
 */

const KEY_TAG = 'e911'
const PREFIX_LEN = 8

export type MintedKey = { key: string; prefix: string; hash: string }

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function mintApiKey(): MintedKey {
  // Hex for the prefix so it never contains the `_` separator; base64url for
  // the secret (may contain `_`, which is why parsing splits on the first two).
  const prefix = crypto.randomBytes(PREFIX_LEN / 2).toString('hex')
  const secret = crypto.randomBytes(32).toString('base64url')
  const key = `${KEY_TAG}_${prefix}_${secret}`
  return { key, prefix, hash: hashApiKey(key) }
}

/** The lookup prefix of a managed key, or null if this is not one. */
export function parseApiKeyPrefix(provided: string): string | null {
  const m = new RegExp(`^${KEY_TAG}_([0-9a-f]{${PREFIX_LEN}})_.{20,}$`).exec(provided)
  return m ? m[1] : null
}

/** Constant-time comparison of two hex digests. */
export function hashesEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}
