'use client'

import { useActionState } from 'react'

import type { UserFormState } from '@/app/actions/studio-users'

type Action = (prev: UserFormState, formData: FormData) => Promise<UserFormState>

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

export function PasswordForm({
  action,
  requireCurrent,
  submitLabel,
}: {
  action: Action
  requireCurrent?: boolean
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {state.ok && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">Password updated.</div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</div>
      )}

      {requireCurrent && (
        <div>
          <label className={labelCls} htmlFor="currentPassword">Current password</label>
          <input className={inputCls} id="currentPassword" name="currentPassword" required type="password" />
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor={requireCurrent ? 'newPassword' : 'password'}>New password</label>
        <input
          className={inputCls}
          id={requireCurrent ? 'newPassword' : 'password'}
          minLength={8}
          name={requireCurrent ? 'newPassword' : 'password'}
          required
          type="password"
        />
        <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
      </div>

      <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
