// Sentry initialization for the browser. Next.js loads this automatically.
import { captureRouterTransitionStart, init } from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const enabled = Boolean(dsn) && process.env.NODE_ENV === 'production'

init({
  dsn,
  enabled,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  // Session Replay: record a sample of sessions, and every session with an error.
  // The Replay integration itself is added after the page has loaded (below),
  // so these sample rates still apply once it starts.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
  debug: false,
})

// Performance: Session Replay was the heaviest main-thread work on first load
// (Lighthouse mobile: ~1.2 s of script time in the Sentry chunk). Load it in its
// own chunk once the page is loaded and the browser is idle, so it no longer
// competes with rendering and the visitor's first tap. Error capture and
// tracing above start immediately, exactly as before.
if (enabled && typeof window !== 'undefined') {
  const startReplay = () => {
    import('./sentry-replay')
      .then((m) => m.startSentryReplay())
      .catch(() => {})
  }
  const whenIdle = () => {
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (ric) ric(startReplay, { timeout: 5000 })
    else setTimeout(startReplay, 2000)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
}

// Capture client-side navigation spans for the App Router.
export const onRouterTransitionStart = captureRouterTransitionStart
