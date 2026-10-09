'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Suspense, useEffect } from 'react'

// NEXT_PUBLIC_* values are inlined at build time, so adding the key in Vercel
// only takes effect on a fresh build (a cache-reusing "Redeploy" keeps the old
// inlined value). Touch this file to force the bundle to pick up a new key.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * Loads PostHog in the browser to capture pageviews and click autocapture for
 * user-journey analytics. No-op until NEXT_PUBLIC_POSTHOG_KEY is set. Visitors
 * stay anonymous (no profile unless identified). Pageviews are captured
 * manually so App Router client navigations are tracked.
 */
export function PostHogProvider() {
  useEffect(() => {
    if (!KEY || typeof window === 'undefined') return
    if (posthog.__loaded) return
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'identified_only',
    })
  }, [])

  if (!KEY) return null
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  )
}

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!KEY || !posthog.__loaded) return
    let url = window.location.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
