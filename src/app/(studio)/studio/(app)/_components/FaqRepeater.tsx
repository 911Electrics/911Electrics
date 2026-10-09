'use client'

import { useState } from 'react'

import { RichTextEditor } from '@/studio/editor/RichTextEditor'

type Row = { key: string; question: string; answer: unknown }

const newKey = () => `faq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

/**
 * Repeater of FAQ rows, each a question input + a WYSIWYG answer editor.
 * Submits `faqKeys` (ordered) plus `faqQuestion__<key>` / `faqAnswer__<key>`
 * fields, which the server action reassembles in order.
 */
export function FaqRepeater({
  label,
  initial,
}: {
  label: string
  initial?: { question: string; answer: unknown }[]
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (initial ?? []).map((f) => ({ key: newKey(), question: f.question, answer: f.answer })),
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
      <input name="faqKeys" type="hidden" value={JSON.stringify(rows.map((r) => r.key))} />

      <div className="space-y-5">
        {rows.length === 0 && <p className="text-sm text-slate-400">No FAQs yet.</p>}
        {rows.map((r) => (
          <div className="rounded-xl border border-slate-200 p-4" key={r.key}>
            <div className="mb-2 flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
                defaultValue={r.question}
                name={`faqQuestion__${r.key}`}
                placeholder="Question"
              />
              <button
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                type="button"
              >
                Remove
              </button>
            </div>
            <RichTextEditor initial={r.answer} name={`faqAnswer__${r.key}`} />
          </div>
        ))}
      </div>

      <button
        className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50"
        onClick={() => setRows((prev) => [...prev, { key: newKey(), question: '', answer: undefined }])}
        type="button"
      >
        + Add FAQ
      </button>
    </section>
  )
}
