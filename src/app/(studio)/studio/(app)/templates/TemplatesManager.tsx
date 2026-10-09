'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { createTemplate, deleteTemplate, updateTemplate } from '@/app/actions/studio-templates'
import { TEMPLATE_KINDS, TEMPLATE_KIND_LABEL } from '@/studio/constants'
import type { ReplyTemplate } from '@/studio/templates'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function TemplatesManager({ templates }: { templates: ReplyTemplate[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<ReplyTemplate | 'new' | null>(null)

  return (
    <div className="space-y-5">
      {editing ? (
        <TemplateEditor
          initial={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      ) : (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          onClick={() => setEditing('new')}
          type="button"
        >
          New template
        </button>
      )}

      {templates.length === 0 ? (
        <p className="text-sm text-slate-400">No templates yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {templates.map((t) => (
            <li className="flex items-start justify-between gap-3 px-5 py-3.5" key={t.id}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{t.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {TEMPLATE_KIND_LABEL[t.kind]}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  onClick={() => setEditing(t)}
                  type="button"
                >
                  Edit
                </button>
                <DeleteButton id={t.id} onDone={() => router.refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TemplateEditor({ initial, onDone }: { initial: ReplyTemplate | null; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          setError(null)
          const res = initial ? await updateTemplate(initial.id, fd) : await createTemplate(fd)
          if (res.ok) onDone()
          else setError(res.error)
        })
      }}
      ref={formRef}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="title">Title</label>
          <input className={inputCls} defaultValue={initial?.title ?? ''} id="title" name="title" required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="kind">Used for</label>
          <select className={inputCls} defaultValue={initial?.kind ?? 'general'} id="kind" name="kind">
            {TEMPLATE_KINDS.map((k) => (
              <option key={k} value={k}>{TEMPLATE_KIND_LABEL[k]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="body">Message</label>
        <textarea className={inputCls} defaultValue={initial?.body ?? ''} id="body" name="body" required rows={5} />
        <p className="mt-1 text-xs text-slate-400">
          Use <code className="rounded bg-slate-100 px-1">{'{{name}}'}</code> and{' '}
          <code className="rounded bg-slate-100 px-1">{'{{business}}'}</code> — they’re filled in when you insert it.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create template'}
        </button>
        <button className="text-sm font-medium text-slate-500 hover:text-slate-700" onClick={onDone} type="button">
          Cancel
        </button>
      </div>
    </form>
  )
}

function DeleteButton({ id, onDone }: { id: number; onDone: () => void }) {
  const [pending, start] = useTransition()
  return (
    <button
      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Delete this template?')) return
        start(async () => {
          await deleteTemplate(id)
          onDone()
        })
      }}
      type="button"
    >
      {pending ? '…' : 'Delete'}
    </button>
  )
}
