'use client'

import { useTransition } from 'react'

import { updateLeadStatus } from '@/app/actions/studio-leads'
import { LEAD_STATUS_LABEL, LEAD_STATUSES, type LeadStatus } from '@/studio/constants'

export function LeadStatusSelect({ id, current }: { id: number; current: LeadStatus }) {
  const [pending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-slate-600">Status</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:opacity-60"
        defaultValue={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as LeadStatus
          startTransition(() => updateLeadStatus(id, next))
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Saving…</span>}
    </label>
  )
}
