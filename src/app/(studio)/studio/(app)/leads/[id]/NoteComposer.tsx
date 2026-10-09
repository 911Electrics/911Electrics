'use client'

import { useState, useTransition } from 'react'

import { addLeadNote } from '@/app/actions/studio-leads'
import { fillTemplate } from '@/studio/constants'

type TemplateOption = { id: number; title: string; body: string }

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function NoteComposer({
  leadId,
  templates,
  leadName,
  businessName,
}: {
  leadId: number
  templates: TemplateOption[]
  leadName: string | null
  businessName: string | null
}) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        const fd = new FormData()
        fd.set('note', text)
        start(async () => {
          await addLeadNote(leadId, fd)
          setText('')
        })
      }}
    >
      {templates.length > 0 && (
        <div className="flex justify-end">
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:border-brand-500 focus:outline-none"
            onChange={(e) => {
              const t = templates.find((x) => String(x.id) === e.target.value)
              if (t) setText(fillTemplate(t.body, { name: leadName, business: businessName }))
              e.target.value = ''
            }}
            value=""
          >
            <option value="">Insert template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inputCls}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note (call summary, next step…)"
          value={text}
        />
        <button
          className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? '…' : 'Add'}
        </button>
      </div>
    </form>
  )
}
