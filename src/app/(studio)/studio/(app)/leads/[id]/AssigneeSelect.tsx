'use client'

import { useTransition } from 'react'

import { assignLead } from '@/app/actions/studio-leads'

export function AssigneeSelect({
  id,
  current,
  users,
}: {
  id: number
  current: number | null
  users: { id: number; label: string }[]
}) {
  const [pending, start] = useTransition()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-slate-600">Owner</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:opacity-60"
        defaultValue={current ?? ''}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value
          start(() => assignLead(id, v === '' ? null : Number(v)))
        }}
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Saving…</span>}
    </label>
  )
}
