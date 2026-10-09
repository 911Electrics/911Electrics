'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { TestimonialFormState } from '@/app/actions/studio-testimonials'
import { TESTIMONIAL_SOURCES, TESTIMONIAL_SOURCE_LABEL } from '@/studio/constants'
import type { StudioTestimonial } from '@/studio/testimonials'

type Action = (prev: TestimonialFormState, formData: FormData) => Promise<TestimonialFormState>

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

export function TestimonialForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action
  initial?: StudioTestimonial | null
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<TestimonialFormState, FormData>(action, {})
  const dateValue = initial?.date ? initial.date.slice(0, 10) : ''

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor="authorName">Reviewer name</label>
        <input className={inputCls} defaultValue={initial?.authorName ?? ''} id="authorName" name="authorName" required type="text" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="location">Location <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} defaultValue={initial?.location ?? ''} id="location" name="location" placeholder="Pasadena, CA" type="text" />
        </div>
        <div>
          <label className={labelCls} htmlFor="rating">Rating</label>
          <select className={inputCls} defaultValue={String(initial?.rating ?? 5)} id="rating" name="rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="text">Review</label>
        <textarea className={inputCls} defaultValue={initial?.text ?? ''} id="text" name="text" required rows={5} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="source">Source <span className="text-slate-400">(optional)</span></label>
          <select className={inputCls} defaultValue={initial?.source ?? ''} id="source" name="source">
            <option value="">— None —</option>
            {TESTIMONIAL_SOURCES.map((s) => (
              <option key={s} value={s}>{TESTIMONIAL_SOURCE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="date">Date <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} defaultValue={dateValue} id="date" name="date" type="date" />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
        <input className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30" defaultChecked={initial?.featured ?? false} name="featured" type="checkbox" />
        Feature this review on the website
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/testimonials">
          Cancel
        </Link>
      </div>
    </form>
  )
}
