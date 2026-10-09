'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function StudioError({
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-800">Something went wrong</h1>
      <p className="mt-1 text-sm text-red-700">
        This screen hit an unexpected error. It’s been logged. Try again, and if it keeps happening
        let support know.
      </p>
      {error.digest && <p className="mt-2 text-xs text-red-400">Reference: {error.digest}</p>}
      <button
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  )
}
