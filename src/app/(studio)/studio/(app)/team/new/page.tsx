import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createUser } from '@/app/actions/studio-users'
import { getStudioUser } from '@/studio/auth'

import { UserForm } from '../UserForm'

export const dynamic = 'force-dynamic'

export default async function NewUserPage() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/team">
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to team
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Add user</h1>
      </header>
      <UserForm action={createUser} mode="create" submitLabel="Create user" />
    </div>
  )
}
