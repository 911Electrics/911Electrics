import Link from 'next/link'

import { getPipelineLeads } from '@/studio/leads'

import { PipelineBoard, type PipelineCard } from './PipelineBoard'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const leads = await getPipelineLeads()
  const cards: PipelineCard[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    service: l.service,
    phone: l.phone,
    status: l.status,
    estimatedValue: l.estimatedValue,
    createdAt: l.createdAt,
    assigneeName: l.assigneeName,
  }))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag a lead between stages to update it. Click a card to open it.
          </p>
        </div>
        <Link
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          href="/studio/leads"
        >
          List view
        </Link>
      </header>

      <PipelineBoard initialCards={cards} />
    </div>
  )
}
