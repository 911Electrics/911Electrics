'use client'

import { useState, useTransition } from 'react'

import { sendResetLinkToUser } from '@/app/actions/studio-reset'

export function SendResetLinkButton({ userId, email }: { userId: number; email: string }) {
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await sendResetLinkToUser(userId)
            setSent(true)
          })
        }
        type="button"
      >
        {pending ? 'Sending…' : 'Email a set-password link'}
      </button>
      {sent && (
        <span className="text-sm text-green-700">Link sent to {email} (if email is configured).</span>
      )}
    </div>
  )
}
