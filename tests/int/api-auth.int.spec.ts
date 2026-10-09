import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mintApiKey } from '@/lib/api-keys'

const verifyApiKey = vi.fn()
vi.mock('@/studio/api-keys', () => ({ verifyApiKey: (...a: unknown[]) => verifyApiKey(...a) }))

const { authenticate, authorize, requireCronSecret } = await import('@/lib/api-auth')

const req = (headers: Record<string, string> = {}) => new Request('https://x.test/api', { headers })
const bearer = (t: string) => req({ authorization: `Bearer ${t}` })
const status = (r: Awaited<ReturnType<typeof authorize>>) => (r.ok ? 200 : r.response.status)

const ENV = ['BLOG_API_TOKEN', 'LEADS_API_TOKEN', 'CRON_SECRET'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
  verifyApiKey.mockReset()
})
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('authorize — fails closed', () => {
  it('refuses when no credential is sent', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    expect(status(await authorize(req(), 'posts:read'))).toBe(401)
  })

  it('refuses everything when nothing is configured', async () => {
    expect(status(await authorize(bearer('anything'), 'posts:read'))).toBe(401)
  })

  it('refuses a wrong token', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    expect(status(await authorize(bearer('blog-secreT'), 'posts:read'))).toBe(401)
  })
})

describe('authorize — legacy env tokens', () => {
  it('treats BLOG_API_TOKEN as a content key', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    const scopes = ['posts:write', 'cities:write', 'services:read', 'testimonials:write', 'cache:write'] as const
    for (const scope of scopes) {
      expect(status(await authorize(bearer('blog-secret'), scope))).toBe(200)
    }
    const auth = await authorize(req({ 'x-api-key': 'blog-secret' }), 'posts:write')
    expect(auth.ok && auth.actor.email).toBe('blog-api')
    expect(auth.ok && auth.legacy).toBe(true)
  })

  it('never lets BLOG_API_TOKEN reach admin-only resources', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    for (const scope of ['settings:write', 'redirects:write', 'audit:read', 'leads:write'] as const) {
      expect(status(await authorize(bearer('blog-secret'), scope))).toBe(403)
    }
  })

  it('lets BLOG_API_TOKEN read leads only until LEADS_API_TOKEN is set', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    expect(status(await authorize(bearer('blog-secret'), 'leads:read'))).toBe(200)

    process.env.LEADS_API_TOKEN = 'leads-secret'
    expect(status(await authorize(bearer('blog-secret'), 'leads:read'))).toBe(403)
    expect(status(await authorize(bearer('leads-secret'), 'leads:read'))).toBe(200)
    expect(status(await authorize(bearer('leads-secret'), 'posts:read'))).toBe(403)
  })

  it('names the missing scope in a 403 so an agent can act on it', async () => {
    process.env.BLOG_API_TOKEN = 'blog-secret'
    const r = await authorize(bearer('blog-secret'), 'settings:write')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const body = await r.response.json()
      expect(body.required).toBe('settings:write')
      expect(body.granted).toContain('posts:*')
    }
  })
})

describe('authorize — managed keys', () => {
  const found = (scopes: string[]) => ({ ok: true, record: { name: 'Daily writer', scopes } })

  it('looks a managed key up by prefix and applies its scopes', async () => {
    const { key, prefix } = mintApiKey()
    verifyApiKey.mockResolvedValue(found(['posts:*']))

    const ok = await authorize(bearer(key), 'posts:write')
    expect(verifyApiKey).toHaveBeenCalledWith(prefix, key)
    expect(ok.ok && ok.actor.email).toBe('api:Daily writer')
    expect(ok.ok && ok.legacy).toBe(false)

    expect(status(await authorize(bearer(key), 'leads:read'))).toBe(403)
  })

  it('does not fall back to env tokens for a key-shaped credential', async () => {
    const { key } = mintApiKey()
    process.env.BLOG_API_TOKEN = key
    verifyApiKey.mockResolvedValue({ ok: false, reason: 'unknown' })
    expect(status(await authorize(bearer(key), 'posts:read'))).toBe(401)
  })

  it('says why a revoked or expired key was refused', async () => {
    const { key } = mintApiKey()
    for (const reason of ['revoked', 'expired'] as const) {
      verifyApiKey.mockResolvedValue({ ok: false, reason })
      const r = await authenticate(bearer(key))
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.response.status).toBe(401)
        expect((await r.response.json()).error).toContain(reason)
      }
    }
  })

  it('answers 503 when the api_keys table has not been installed', async () => {
    verifyApiKey.mockResolvedValue({ ok: false, reason: 'not-installed' })
    expect(status(await authorize(bearer(mintApiKey().key), 'posts:read'))).toBe(503)
  })
})

describe('requireCronSecret', () => {
  it('refuses when CRON_SECRET is unset — an unset secret never means open', () => {
    const r = requireCronSecret(bearer('anything'))
    expect(!r.ok && r.response.status).toBe(503)
    const none = requireCronSecret(req())
    expect(!none.ok && none.response.status).toBe(503)
  })

  it('accepts only the exact bearer secret', () => {
    process.env.CRON_SECRET = 'cron-secret'
    expect(requireCronSecret(bearer('cron-secret')).ok).toBe(true)
    expect(requireCronSecret(bearer('nope')).ok).toBe(false)
    expect(requireCronSecret(req({ 'x-api-key': 'cron-secret' })).ok).toBe(false)
    expect(requireCronSecret(req()).ok).toBe(false)
  })
})
