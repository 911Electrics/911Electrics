'use client'

import { useState } from 'react'

type Item = { title: string; text: string }

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function TextItemRepeater({
  name,
  label,
  initial,
  titlePlaceholder = 'Title',
  textPlaceholder = 'Description',
}: {
  name: string
  label: string
  initial?: Item[]
  titlePlaceholder?: string
  textPlaceholder?: string
}) {
  const [items, setItems] = useState<Item[]>(initial ?? [])

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
      <input name={name} type="hidden" value={JSON.stringify(items.filter((i) => i.title || i.text))} />
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
        {items.map((it, i) => (
          <div className="flex gap-2" key={i}>
            <input
              className={`${inputCls} max-w-[14rem]`}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder={titlePlaceholder}
              value={it.title}
            />
            <input
              className={inputCls}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder={textPlaceholder}
              value={it.text}
            />
            <button
              className="shrink-0 rounded-lg px-3 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50"
        onClick={() => setItems((prev) => [...prev, { title: '', text: '' }])}
        type="button"
      >
        + Add
      </button>
    </section>
  )
}
