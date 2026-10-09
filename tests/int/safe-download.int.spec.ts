import dns from 'node:dns'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertPublicHttpsUrl,
  guardedLookup,
  isBlockedAddress,
  UnsafeUrlError,
} from '@/lib/safe-download'

describe('isBlockedAddress', () => {
  it('blocks loopback, private, link-local and other non-public IPv4', () => {
    for (const ip of [
      '127.0.0.1',
      '127.255.255.254',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.64.0.1', // CGNAT
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
      '198.18.0.1',
    ]) {
      expect([ip, isBlockedAddress(ip)]).toEqual([ip, true])
    }
  })

  it('allows ordinary public IPv4, including the edges of private ranges', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.255.255', '172.32.0.1', '192.167.255.255', '100.63.255.255', '151.101.1.140']) {
      expect([ip, isBlockedAddress(ip)]).toEqual([ip, false])
    }
  })

  it('blocks non-public IPv6, including IPv4-mapped forms of private addresses', () => {
    for (const ip of [
      '::1',
      '::',
      'fe80::1',
      'fc00::1',
      'fd12:3456:789a::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:a9fe:a9fe', // 169.254.169.254 in hex
      '64:ff9b::a00:1',
      '2001:db8::1',
    ]) {
      expect([ip, isBlockedAddress(ip)]).toEqual([ip, true])
    }
  })

  it('allows public IPv6', () => {
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false)
    expect(isBlockedAddress('2a00:1450:4001:81b::200e')).toBe(false)
  })

  it('treats anything that is not an IP address as blocked', () => {
    for (const v of ['', 'localhost', 'example.com', '1.2.3', '999.1.1.1']) {
      expect(isBlockedAddress(v)).toBe(true)
    }
  })
})

describe('assertPublicHttpsUrl', () => {
  it('accepts ordinary https image URLs', () => {
    expect(assertPublicHttpsUrl('https://images.example.com/a/hero.jpg?w=1200').hostname).toBe('images.example.com')
    expect(assertPublicHttpsUrl('https://example.com:443/x.png').port).toBe('')
    expect(assertPublicHttpsUrl('https://8.8.8.8/x.png').hostname).toBe('8.8.8.8')
  })

  it('refuses every scheme but https', () => {
    for (const url of ['http://example.com/x.png', 'file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com/', 'data:image/png;base64,AAAA']) {
      expect(() => assertPublicHttpsUrl(url)).toThrow(UnsafeUrlError)
    }
  })

  it('refuses non-default ports and embedded credentials', () => {
    expect(() => assertPublicHttpsUrl('https://example.com:8443/x.png')).toThrow(UnsafeUrlError)
    expect(() => assertPublicHttpsUrl('https://example.com:22/')).toThrow(UnsafeUrlError)
    expect(() => assertPublicHttpsUrl('https://user:pass@example.com/x.png')).toThrow(UnsafeUrlError)
  })

  it('refuses private and loopback IP literals in every spelling the URL parser normalises', () => {
    for (const url of [
      'https://127.0.0.1/',
      'https://169.254.169.254/latest/meta-data/',
      'https://10.0.0.5/x.png',
      'https://[::1]/',
      'https://[::ffff:127.0.0.1]/',
      'https://[fd00::1]/',
      'https://2130706433/', // decimal 127.0.0.1
      'https://0x7f.0.0.1/', // hex octet
      'https://017700000001/', // octal
      'https://127.1/', // short form
    ]) {
      expect(() => assertPublicHttpsUrl(url), url).toThrow(UnsafeUrlError)
    }
  })

  it('refuses internal-looking and single-label host names', () => {
    for (const url of ['https://localhost/', 'https://db.internal/x', 'https://printer.local/', 'https://intranet/', 'https://nas.lan/x']) {
      expect(() => assertPublicHttpsUrl(url), url).toThrow(UnsafeUrlError)
    }
  })

  it('refuses garbage', () => {
    for (const url of ['', 'not a url', 'https://', '//example.com/x.png']) {
      expect(() => assertPublicHttpsUrl(url)).toThrow(UnsafeUrlError)
    }
  })
})

describe('guardedLookup', () => {
  afterEach(() => vi.restoreAllMocks())

  const stubDns = (addresses: dns.LookupAddress[]) =>
    vi.spyOn(dns, 'lookup').mockImplementation(((_h: string, _o: unknown, cb: (e: null, a: dns.LookupAddress[]) => void) =>
      cb(null, addresses)) as never)

  const run = (options: dns.LookupOptions) =>
    new Promise<{ err: NodeJS.ErrnoException | null; address: unknown; family?: number }>((resolve) =>
      guardedLookup('cdn.example.com', options, (err, address, family) => resolve({ err, address, family })),
    )

  it('passes a public address through in both callback shapes', async () => {
    stubDns([{ address: '151.101.1.140', family: 4 }])
    expect(await run({})).toEqual({ err: null, address: '151.101.1.140', family: 4 })
    const all = await run({ all: true })
    expect(all.err).toBeNull()
    expect(all.address).toEqual([{ address: '151.101.1.140', family: 4 }])
  })

  it('refuses a public-looking name that resolves to a private address (DNS rebinding)', async () => {
    stubDns([{ address: '169.254.169.254', family: 4 }])
    const { err } = await run({})
    expect(err).toBeInstanceOf(UnsafeUrlError)
    expect(err?.code).toBe('EBLOCKED')
  })

  it('refuses when ANY record is private, even if the first is public', async () => {
    stubDns([
      { address: '151.101.1.140', family: 4 },
      { address: '10.0.0.7', family: 4 },
    ])
    expect((await run({ all: true })).err).toBeInstanceOf(UnsafeUrlError)
  })

  it('refuses an empty answer', async () => {
    stubDns([])
    expect((await run({})).err).toBeInstanceOf(UnsafeUrlError)
  })
})
