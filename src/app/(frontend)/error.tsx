'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

export default function FrontendError({
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
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-navy-950">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        Sorry — this page hit an unexpected error. Please try again, or call us and we’ll help right
        away.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-navy-900 transition hover:bg-slate-50"
          href="/"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
