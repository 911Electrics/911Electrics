import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { setUserPassword, updateUser } from '@/app/actions/studio-users'
import { getStudioUser } from '@/studio/auth'
import { getUserById } from '@/studio/users'

import { PasswordForm } from '../PasswordForm'
import { ResetTotpButton } from '../ResetTotpButton'
import { SendResetLinkButton } from '../SendResetLinkButton'
import { UserForm } from '../UserForm'

export const dynamic = 'force-dynamic'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')

  const { id } = await params
  const userId = Number(id)
  if (Number.isNaN(userId)) notFound()
  const user = await getUserById(userId)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/team">
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to team
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit user</h1>
      </header>

      <UserForm action={updateUser.bind(null, userId)} initial={user} mode="edit" submitLabel="Save user" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Set password</h2>
        <PasswordForm action={setUserPassword.bind(null, userId)} submitLabel="Set new password" />
        <p className="text-xs text-slate-400">
          Or let them set their own — emails a one-time link (valid 1 hour):
        </p>
        <SendResetLinkButton email={user.email} userId={userId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Two-factor authentication
        </h2>
        {user.totpEnabled ? (
          <>
            <p className="text-sm text-slate-500">
              This user has two-factor authentication enabled. Reset it only if they’ve lost access
              to their authenticator and recovery codes.
            </p>
            <ResetTotpButton userId={userId} />
          </>
        ) : (
          <p className="text-sm text-slate-500">
            This user hasn’t enabled two-factor authentication.
          </p>
        )}
      </section>
    </div>
  )
}
