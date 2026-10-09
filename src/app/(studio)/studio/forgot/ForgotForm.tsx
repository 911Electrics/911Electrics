'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { requestPasswordReset } from '@/app/actions/studio-reset'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {})

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        If an account exists for that email, we’ve sent a link to set a new password (valid for 1
        hour). Check your inbox.
        <div className="mt-4">
          <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/studio/login">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
        <input className={inputCls} id="email" name="email" placeholder="you@example.com" required type="email" />
      </div>
      <button
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
      <div className="text-center">
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/login">
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
