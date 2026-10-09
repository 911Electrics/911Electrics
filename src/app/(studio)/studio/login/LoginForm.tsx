'use client'

import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'

import { loginAction, verifyTotpAction, type StudioLoginState } from '@/app/actions/studio-auth'

const initialState: StudioLoginState = {}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  if (state.needsTotp) {
    return <TotpStep />
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClass}
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={inputClass}
          id="password"
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <div className="text-center">
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/forgot">
          Forgot password?
        </Link>
      </div>
    </form>
  )
}

function TotpStep() {
  const [state, formAction, pending] = useActionState(verifyTotpAction, { needsTotp: true })

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit code from your authenticator app, or a recovery code.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="code">
          Authentication code
        </label>
        <input
          autoComplete="one-time-code"
          autoFocus
          className={`${inputClass} text-center text-lg tracking-[0.3em]`}
          id="code"
          inputMode="numeric"
          name="code"
          placeholder="123456"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? 'Verifying…' : 'Verify'}
      </button>
      <div className="text-center">
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/login">
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
