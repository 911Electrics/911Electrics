'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Catches errors in the root layout itself. Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ marginTop: '0.5rem', color: '#475569' }}>
          Please try again in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            background: '#d01d24',
            color: '#fff',
            border: 0,
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
