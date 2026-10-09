// Sentry initialization for the Edge runtime (middleware, edge routes).
// Loaded from src/instrumentation.ts via the Next.js `register` hook.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
  debug: false,
})
