import { describe, expect, it } from 'vitest'

import { hashApiKey, hashesEqual, mintApiKey, parseApiKeyPrefix } from '@/lib/api-keys'
import { API_KEY_PRESETS, grantsAllow, isApiGrant, normalizeGrants } from '@/lib/api-scopes'

describe('API scopes', () => {
  it('accepts concrete scopes and the three wildcard forms', () => {
    for (const g of ['posts:read', 'leads:write', 'posts:*', '*:read', '*']) {
      expect(isApiGrant(g)).toBe(true)
    }
  })

  it('rejects unknown resources, unknown actions and malformed grants', () => {
    for (const g of ['users:read', 'posts:delete', 'posts', 'posts:read:x', '*:*', '', ':read', 7, null]) {
      expect(isApiGrant(g)).toBe(false)
    }
  })

  it('normalizes to valid, unique, sorted grants', () => {
    expect(normalizeGrants(['posts:write', 'bogus', 'posts:read', 'posts:write', 3])).toEqual([
      'posts:read',
      'posts:write',
    ])
    expect(normalizeGrants('posts:read')).toEqual([])
    expect(normalizeGrants(null)).toEqual([])
  })

  it('matches exact, per-resource, per-action and global wildcards', () => {
    expect(grantsAllow(['posts:write'], 'posts:write')).toBe(true)
    expect(grantsAllow(['posts:*'], 'posts:write')).toBe(true)
    expect(grantsAllow(['*:read'], 'leads:read')).toBe(true)
    expect(grantsAllow(['*'], 'settings:write')).toBe(true)
  })

  it('does not leak across resources or from read to write', () => {
    expect(grantsAllow(['posts:*'], 'leads:read')).toBe(false)
    expect(grantsAllow(['posts:read'], 'posts:write')).toBe(false)
    expect(grantsAllow(['*:read'], 'posts:write')).toBe(false)
    expect(grantsAllow([], 'posts:read')).toBe(false)
  })

  it('ships presets made of valid grants, and only three of them reach customer data', () => {
    for (const p of API_KEY_PRESETS) expect(p.grants.every(isApiGrant)).toBe(true)
    const readsLeads = API_KEY_PRESETS.filter((p) => grantsAllow(p.grants, 'leads:read')).map((p) => p.id)
    expect(readsLeads.sort()).toEqual(['admin', 'leads-read', 'readonly'])
    // The blog writer preset is the one handed to an outside party.
    const writer = API_KEY_PRESETS.find((p) => p.id === 'writer')!
    expect(grantsAllow(writer.grants, 'posts:write')).toBe(true)
    expect(grantsAllow(writer.grants, 'cities:write')).toBe(false)
  })
})

describe('API keys', () => {
  it('mints e911_<8 hex>_<secret> with a matching hash', () => {
    const { key, prefix, hash } = mintApiKey()
    expect(key).toMatch(/^e911_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$/)
    expect(key.split('_')[1]).toBe(prefix)
    expect(hash).toBe(hashApiKey(key))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('never mints the same key twice', () => {
    const keys = new Set(Array.from({ length: 50 }, () => mintApiKey().key))
    expect(keys.size).toBe(50)
  })

  it('recognises a managed key by shape and ignores anything else', () => {
    const { key, prefix } = mintApiKey()
    expect(parseApiKeyPrefix(key)).toBe(prefix)
    expect(parseApiKeyPrefix('some-legacy-env-token')).toBeNull()
    expect(parseApiKeyPrefix('e911_zzzzzzzz_' + 'a'.repeat(43))).toBeNull()
    expect(parseApiKeyPrefix('e911_abcd1234_short')).toBeNull()
    expect(parseApiKeyPrefix('')).toBeNull()
  })

  it('compares hashes by value and tolerates unequal lengths', () => {
    const h = hashApiKey('x')
    expect(hashesEqual(h, hashApiKey('x'))).toBe(true)
    expect(hashesEqual(h, hashApiKey('y'))).toBe(false)
    expect(hashesEqual(h, 'short')).toBe(false)
  })
})
