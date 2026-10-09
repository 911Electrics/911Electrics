// Sentry initialization for the Node.js server runtime.
// Loaded from src/instrumentation.ts via the Next.js `register` hook.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // Only report from real deployments — keep local `pnpm dev` noise out of Sentry.
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Performance tracing. Dial down if event volume/cost becomes a concern.
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
  debug: false,
})
