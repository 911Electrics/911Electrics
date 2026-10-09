import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getStudioUser } from '@/studio/auth'
import { getStudioSettings } from '@/studio/settings'

import { SettingsForm } from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function StudioSettingsPage() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (me.role !== 'admin') redirect('/studio')

  const settings = await getStudioSettings()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Business Info</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your business details, contact info and social links. Changes go live on the website
          immediately.
        </p>
      </header>
      <SettingsForm initial={settings} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Google Business Profile</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Sync and reply to your Google reviews, and feature them on the site.
            </p>
          </div>
          <Link
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            href="/studio/settings/google"
          >
            Manage connection
          </Link>
        </div>
      </section>
    </div>
  )
}
