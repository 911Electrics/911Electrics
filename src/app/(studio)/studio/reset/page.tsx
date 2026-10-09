import type { Metadata } from 'next'

import Link from 'next/link'

import { ResetForm } from './ResetForm'

export const metadata: Metadata = { title: 'Set password · Studio', robots: { index: false } }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token = '', email = '' } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
          {email && <p className="mt-1 text-sm text-slate-500">for {email}</p>}
        </div>
        {token && email ? (
          <ResetForm email={email} token={token} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            This link is missing its token.{' '}
            <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/studio/forgot">
              Request a new one
            </Link>
            .
          </div>
        )}
      </div>
    </main>
  )
}
