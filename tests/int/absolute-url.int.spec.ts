import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { blogPostingSchema, electricianSchema } from '@/lib/schema-org'
import { absoluteUrl } from '@/utilities/absoluteUrl'
import { buildMeta } from '@/utilities/buildMeta'

const SUPA =
  'https://hywqbbjwepliduwamhip.supabase.co/storage/v1/object/public/media/post7-hero-1024x576-1039e93782f2.webp'
const BASE = 'https://911electrics.com'

describe('absoluteUrl', () => {
  it('passes absolute http(s) URLs through unchanged', () => {
    expect(absoluteUrl(SUPA, BASE)).toBe(SUPA)
    expect(absoluteUrl('http://example.com/a.jpg', BASE)).toBe('http://example.com/a.jpg')
    expect(absoluteUrl('HTTPS://Example.com/a.jpg', BASE)).toBe('HTTPS://Example.com/a.jpg')
  })
  it('resolves relative paths against the site URL with exactly one slash', () => {
    expect(absoluteUrl('/media/a.jpg', BASE)).toBe(`${BASE}/media/a.jpg`)
    expect(absoluteUrl('/media/a.jpg', `${BASE}/`)).toBe(`${BASE}/media/a.jpg`)
    expect(absoluteUrl('media/a.jpg', BASE)).toBe(`${BASE}/media/a.jpg`)
  })
  it('handles protocol-relative and empty values', () => {
    expect(absoluteUrl('//cdn.example.com/a.jpg', BASE)).toBe('https://cdn.example.com/a.jpg')
    expect(absoluteUrl(null, BASE)).toBeUndefined()
    expect(absoluteUrl('', BASE)).toBeUndefined()
  })
})

describe('metadata and JSON-LD image URLs', () => {
  const prev = process.env.NEXT_PUBLIC_SERVER_URL
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SERVER_URL = BASE
  })
  afterEach(() => {
    process.env.NEXT_PUBLIC_SERVER_URL = prev
  })

  const ogUrl = (m: ReturnType<typeof buildMeta>) => {
    const imgs = m.openGraph?.images
    const first = Array.isArray(imgs) ? imgs[0] : imgs
    return typeof first === 'object' && first && 'url' in first ? String(first.url) : String(first)
  }

  it('buildMeta keeps a Supabase-hosted og image as-is', () => {
    const m = buildMeta({ image: { url: SUPA, sizes: {} } as never, path: '/x/' })
    expect(ogUrl(m)).toBe(SUPA)
  })
  it('buildMeta prefers the og size and resolves a relative one', () => {
    const m = buildMeta({
      image: { url: '/a.jpg', sizes: { og: '/a-og.jpg' } } as never,
      path: '/x/',
    })
    expect(ogUrl(m)).toBe(`${BASE}/a-og.jpg`)
  })
  it('blogPostingSchema image passes absolute URLs through', () => {
    const s = blogPostingSchema({ title: 't', slug: 's', heroImage: { url: SUPA } }, {
      businessName: 'b',
    } as never)
    expect(s.image).toBe(SUPA)
    const r = blogPostingSchema({ title: 't', slug: 's', heroImage: { url: '/h.jpg' } }, {
      businessName: 'b',
    } as never)
    expect(r.image).toBe(`${BASE}/h.jpg`)
  })
  it('electricianSchema logo/image pass absolute URLs through', () => {
    const s = electricianSchema({
      businessName: 'b',
      phone: 'p',
      email: 'e',
      licenseNumber: '1',
      logo: { url: SUPA },
      defaultOGImage: { url: '/og.jpg' },
    } as never)
    expect(s.logo).toBe(SUPA)
    expect(s.image).toBe(`${BASE}/og.jpg`)
  })
})
