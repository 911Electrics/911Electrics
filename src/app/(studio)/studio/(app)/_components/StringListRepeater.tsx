'use client'

import { useState } from 'react'

export function StringListRepeater({
  name,
  label,
  initial,
  placeholder,
}: {
  name: string
  label: string
  initial?: string[]
  placeholder?: string
}) {
  const [items, setItems] = useState<string[]>(initial ?? [])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
      <input name={name} type="hidden" value={JSON.stringify(items.map((s) => s.trim()).filter(Boolean))} />
      <div className="flex flex-wrap gap-2">
        {items.map((v, i) => (
          <div className="flex items-center" key={i}>
            <input
              className="w-36 rounded-l-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
              onChange={(e) => setItems((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={placeholder}
              value={v}
            />
            <button
              className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50"
        onClick={() => setItems((prev) => [...prev, ''])}
        type="button"
      >
        + Add
      </button>
    </section>
  )
}
