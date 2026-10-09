import { redirect } from 'next/navigation'

import { getStudioUser } from '@/studio/auth'

import { LoginForm } from './LoginForm'

export default async function StudioLoginPage() {
  // Already signed in → straight to the dashboard.
  const user = await getStudioUser()
  if (user) redirect('/studio')

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="911 Construction & Electric Inc." className="h-14 w-auto" src="/logo.png" />
          <p className="mt-4 text-sm text-slate-500">Sign in to your dashboard</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
