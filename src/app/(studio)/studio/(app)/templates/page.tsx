import { redirect } from 'next/navigation'

import { can, getStudioUser } from '@/studio/auth'
import { getTemplates } from '@/studio/templates'

import { TemplatesManager } from './TemplatesManager'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const me = await getStudioUser()
  if (!me) redirect('/studio/login')
  if (!(me.role === 'admin' || can(me, 'leads') || can(me, 'reviews'))) redirect('/studio')

  const templates = await getTemplates()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reply templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reusable canned responses for lead notes and review replies. Insert them from the lead and
          review screens.
        </p>
      </header>
      <TemplatesManager templates={templates} />
    </div>
  )
}
