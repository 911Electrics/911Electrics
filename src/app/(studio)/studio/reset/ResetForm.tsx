'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { resetPassword } from '@/app/actions/studio-reset'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, {})

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Your password has been set.
        <div className="mt-4">
          <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/studio/login">
            Sign in
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
      <input name="token" type="hidden" value={token} />
      <input name="email" type="hidden" value={email} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">New password</label>
        <input autoComplete="new-password" className={inputCls} id="password" minLength={8} name="password" required type="password" />
        <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
      </div>
      <button
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  )
}
