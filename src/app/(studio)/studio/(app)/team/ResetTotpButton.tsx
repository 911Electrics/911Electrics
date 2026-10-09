'use client'

import { useState, useTransition } from 'react'

import { adminResetUserTotp } from '@/app/actions/studio-2fa'

export function ResetTotpButton({ userId }: { userId: number }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return <span className="text-sm text-green-700">Two-factor reset. The user can re-enrol from their account.</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="rounded-lg px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          if (!window.confirm('Reset this user’s two-factor authentication? They will sign in with just their password until they set it up again.')) {
            return
          }
          startTransition(async () => {
            setError(null)
            const res = await adminResetUserTotp(userId)
            if (res.ok) setDone(true)
            else setError(res.error)
          })
        }}
        type="button"
      >
        {pending ? 'Resetting…' : 'Reset two-factor'}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  )
}
