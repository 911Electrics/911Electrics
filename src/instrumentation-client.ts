// Sentry initialization for the browser. Next.js loads this automatically.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  // Session Replay: record a sample of sessions, and every session with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  sendDefaultPii: false,
  debug: false,
})

// Capture client-side navigation spans for the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
