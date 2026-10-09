import dns from 'node:dns'
import https from 'node:https'
import net from 'node:net'

/**
 * Download a file from a caller-supplied URL without letting the caller aim the
 * server at itself or its network (SSRF).
 *
 * `ingestImageFromUrl` used to `fetch(url, { redirect: 'follow' })` whatever an
 * API caller sent: any scheme `fetch` speaks, any host, any port, redirects
 * followed blindly, and the whole body buffered before its size was checked.
 * From inside a cloud function that reaches link-local metadata services,
 * loopback, and private ranges — and the response comes back to the caller as a
 * "hero image" error message or a stored file.
 *
 * The rules here:
 *   - https only, default port only, no credentials in the URL;
 *   - the address is checked **at connect time**, inside the socket's DNS
 *     lookup, so the address that is validated is the address that is dialled.
 *     Checking a hostname first and fetching afterwards leaves a gap in which
 *     the DNS answer can change (rebinding); this has no such gap;
 *   - redirects are followed by hand, a few at most, and every hop goes through
 *     the same checks — a public URL may not bounce to a private one;
 *   - the body is streamed and abandoned the moment it exceeds the cap, and the
 *     whole transfer has a deadline.
 */

export class UnsafeUrlError extends Error {}

const blocked = new net.BlockList()
for (const [prefix, bits] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local — cloud metadata lives here
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(prefix, bits, 'ipv4')
}
for (const [prefix, bits] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(prefix, bits, 'ipv6')
}

/** The 8 hextets of an IPv6 address (dotted-quad tail included), or null. */
function hextets(address: string): number[] | null {
  let text = address
  const dotted = /^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text)
  if (dotted) {
    const [a, b, c, d] = dotted.slice(2).map(Number)
    text = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [head, tail, ...extra] = text.split('::')
  if (extra.length) return null
  const left = head ? head.split(':') : []
  const right = tail !== undefined ? (tail ? tail.split(':') : []) : null
  const groups =
    right === null
      ? left
      : [...left, ...new Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  if (groups.length !== 8) return null
  const values = groups.map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN))
  return values.some(Number.isNaN) ? null : values
}

/**
 * True for anything that is not a public, routable unicast address.
 *
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is refused outright rather than listed as
 * a subnet: `net.BlockList` also tests plain IPv4 addresses against mapped
 * rules, so a `::ffff:0:0/96` entry blocks the whole IPv4 internet. A mapped
 * address has no business coming back from public DNS, and it is exactly how a
 * private v4 address would be smuggled past the v4 list.
 */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address)
  if (family === 4) return blocked.check(address, 'ipv4')
  if (family === 6) {
    const h = hextets(address)
    if (!h) return true
    const mapped = h.slice(0, 5).every((v) => v === 0) && h[5] === 0xffff
    return mapped || blocked.check(address, 'ipv6')
  }
  return true // not an IP address at all
}

const BLOCKED_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/i

/** Parse and vet a URL before any network activity. Throws UnsafeUrlError. */
export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError('That is not a valid URL.')
  }
  if (url.protocol !== 'https:') throw new UnsafeUrlError('Only https:// image URLs are accepted.')
  if (url.username || url.password) throw new UnsafeUrlError('URLs with credentials are not accepted.')
  if (url.port && url.port !== '443') throw new UnsafeUrlError('Only the default https port is accepted.')

  // WHATWG URL keeps the brackets on an IPv6 literal.
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!host) throw new UnsafeUrlError('That URL has no host.')
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new UnsafeUrlError('That address is not publicly routable.')
  } else if (BLOCKED_NAMES.test(host) || !host.includes('.')) {
    throw new UnsafeUrlError('That host is not a public internet name.')
  }
  return url
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void

/**
 * A `lookup` for `https.request` that refuses a name resolving to any blocked
 * address. "Any", not "the first": a name with one public and one private
 * record must not get to pick.
 */
export function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback,
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, results) => {
    if (err) return callback(err, [])
    const addresses = results as dns.LookupAddress[]
    const bad = addresses.find((a) => isBlockedAddress(a.address))
    if (bad || addresses.length === 0) {
      const refusal: NodeJS.ErrnoException = new UnsafeUrlError(
        'That host resolves to an address that is not publicly routable.',
      )
      refusal.code = 'EBLOCKED'
      return callback(refusal, [])
    }
    if (options.all) return callback(null, addresses)
    callback(null, addresses[0].address, addresses[0].family)
  })
}

export type Downloaded = { bytes: Buffer; contentType: string; finalUrl: string }

function requestOnce(
  url: URL,
  maxBytes: number,
  deadline: number,
): Promise<{ redirect: string } | Downloaded> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) return reject(new Error('Timed out downloading the image.'))

    const req = https.get(
      url,
      {
        lookup: guardedLookup as unknown as net.LookupFunction,
        timeout: remaining,
        headers: { accept: 'image/*', 'user-agent': '911electrics-media-ingest' },
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          return resolve({ redirect: new URL(res.headers.location, url).toString() })
        }
        if (status < 200 || status >= 300) {
          res.resume()
          return reject(new Error(`Could not download the image (HTTP ${status}).`))
        }

        const declared = Number(res.headers['content-length'])
        if (Number.isFinite(declared) && declared > maxBytes) {
          req.destroy()
          return reject(new Error('Image is too large.'))
        }

        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            req.destroy()
            return reject(new Error('Image is too large.'))
          }
          chunks.push(chunk)
        })
        res.on('end', () =>
          resolve({
            bytes: Buffer.concat(chunks),
            contentType: String(res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase(),
            finalUrl: url.toString(),
          }),
        )
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error('Timed out downloading the image.')))
    req.on('error', reject)
  })
}

/** Download from a public https URL. Throws UnsafeUrlError for a refused target. */
export async function downloadPublicFile(
  rawUrl: string,
  opts: { maxBytes: number; timeoutMs?: number; maxRedirects?: number },
): Promise<Downloaded> {
  const deadline = Date.now() + (opts.timeoutMs ?? 15_000)
  const maxRedirects = opts.maxRedirects ?? 3

  let next = rawUrl
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const result = await requestOnce(assertPublicHttpsUrl(next), opts.maxBytes, deadline)
    if (!('redirect' in result)) return result
    next = result.redirect
  }
  throw new Error('Too many redirects downloading the image.')
}
