import type { Metadata } from 'next'

import { ForgotForm } from './ForgotForm'

export const metadata: Metadata = { title: 'Reset password · Studio', robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">We’ll email you a link to set a new one.</p>
        </div>
        <ForgotForm />
      </div>
    </main>
  )
}
