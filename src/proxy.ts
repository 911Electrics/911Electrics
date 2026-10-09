import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getCanonicalHost } from '@/utilities/canonicalHost'

/**
 * Content-Security-Policy.
 *
 * Shipped in *Report-Only* mode: the browser reports violations but never
 * blocks anything, so this cannot break the live site. Promote to enforcing
 * once the violation reports are clean (see ENFORCE below).
 *
 * Noncing: the request header is set to `Content-Security-Policy` so Next.js
 * picks up the nonce and applies it to every framework script it emits
 * (avoiding false violations). The *response* header is Report-Only, which is
 * what actually governs browser enforcement. To enforce, set ENFORCE = true.
 *
 * Scope: the matcher below excludes /admin (Payload's panel ships its own
 * inline scripts/styles and is auth-gated) and /api, so this only governs the
 * public marketing site.
 */
const ENFORCE = false

const CANONICAL_HOST = getCanonicalHost()

function buildCSP(nonce: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'strict-dynamic' lets the nonce'd Next scripts load their own chunks;
    // https:/'unsafe-inline' are CSP3 fallbacks for browsers without it.
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", 'https:', "'unsafe-inline'"],
    // React renders inline style="" attributes; nonces don't cover those.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'"],
    'media-src': ["'self'"],
    'manifest-src': ["'self'"],
    // Must mirror the enforced allowlist in next.config.ts, or promoting this
    // policy (ENFORCE = true) would start blocking live dependencies. Covers
    // PostHog (analytics capture), Sentry (errors + session replay), Google
    // Analytics/Tag Manager, and Cloudflare Turnstile (quote-form captcha).
    'connect-src': [
      "'self'",
      'https://*.posthog.com',
      'https://*.i.posthog.com',
      'https://*.sentry.io',
      'https://*.ingest.us.sentry.io',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com',
      'https://challenges.cloudflare.com',
    ],
    // Sentry session replay spins up a worker from a blob URL.
    'worker-src': ["'self'", 'blob:'],
    // Google Maps iframe (contact section) + Cloudflare Turnstile challenge frame.
    'frame-src': ["'self'", 'https://www.google.com', 'https://challenges.cloudflare.com'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCSP(nonce)

  // Pass the nonce + CSP to Next on the request so it nonces its own scripts.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // The response header governs the browser. Report-Only until ENFORCE flips.
  response.headers.set(
    ENFORCE ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    csp,
  )

  // Block indexing of any non-canonical host (e.g. the *.vercel.app domain).
  if (CANONICAL_HOST) {
    const host = request.headers.get('host')?.replace(/:\d+$/, '') || ''
    if (host && host !== CANONICAL_HOST) {
      response.headers.set('X-Robots-Tag', 'noindex')
    }
  }

  return response
}

export const config = {
  // Run on page routes only — skip the Payload admin, API routes, Next
  // internals, and static asset files (which don't execute scripts).
  matcher: [
    {
      source:
        '/((?!admin|api|_next/static|_next/image|favicon.ico|favicon-32x32.png|icon-192.png|apple-touch-icon.png|site.webmanifest|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
