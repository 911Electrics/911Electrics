'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { CityFormState } from '@/app/actions/studio-cities'
import type { MediaItem } from '@/studio/media'
import type { StudioCity } from '@/studio/cities'
import { RichTextEditor } from '@/studio/editor/RichTextEditor'

import { FaqRepeater } from '../_components/FaqRepeater'
import { MediaPicker } from '../_components/MediaPicker'
import { StringListRepeater } from '../_components/StringListRepeater'

type Action = (prev: CityFormState, formData: FormData) => Promise<CityFormState>

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

export function CityForm({
  action,
  initial,
  mediaItems,
  submitLabel,
}: {
  action: Action
  initial?: StudioCity | null
  mediaItems: MediaItem[]
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<CityFormState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</div>
      )}

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="cityName">City name</label>
            <input className={inputCls} defaultValue={initial?.cityName ?? ''} id="cityName" name="cityName" required type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="region">Region <span className="text-slate-400">(optional)</span></label>
            <input className={inputCls} defaultValue={initial?.region ?? ''} id="region" name="region" placeholder="Los Angeles County" type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">URL slug <span className="text-slate-400">(blank = from city)</span></label>
            <input className={inputCls} defaultValue={initial?.slug ?? ''} id="slug" name="slug" placeholder="electrician-burbank-ca" type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="pathOverride">Path override <span className="text-slate-400">(optional, full path)</span></label>
            <input className={inputCls} defaultValue={initial?.pathOverride ?? ''} id="pathOverride" name="pathOverride" placeholder="/services/los-angeles-ca/" type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="status">Status</label>
            <select className={inputCls} defaultValue={initial?.status ?? 'draft'} id="status" name="status">
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="heroHeadingOverride">Hero heading override <span className="text-slate-400">(optional)</span></label>
            <input className={inputCls} defaultValue={initial?.heroHeadingOverride ?? ''} id="heroHeadingOverride" name="heroHeadingOverride" type="text" />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Override fields replace the shared service-area template for this city. Leave blank to use
          the template (with the city name filled in automatically).
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className={labelCls}>Intro override <span className="text-slate-400">(optional)</span></span>
        <RichTextEditor initial={initial?.introOverride} name="introOverride" />
      </section>

      <StringListRepeater initial={initial?.neighborhoods} label="Neighborhoods" name="neighborhoods" placeholder="Neighborhood" />
      <StringListRepeater initial={initial?.zipCodes} label="ZIP codes" name="zipCodes" placeholder="91501" />

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className={labelCls}>Local notes <span className="text-slate-400">(optional)</span></span>
        <RichTextEditor initial={initial?.localNotes} name="localNotes" />
      </section>

      <FaqRepeater initial={initial?.faqsOverride} label="FAQ overrides" />

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">SEO</h2>
        <div>
          <label className={labelCls} htmlFor="metaTitle">Meta title <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} defaultValue={initial?.metaTitle ?? ''} id="metaTitle" name="metaTitle" type="text" />
        </div>
        <div>
          <label className={labelCls} htmlFor="metaDescription">Meta description <span className="text-slate-400">(optional)</span></label>
          <textarea className={inputCls} defaultValue={initial?.metaDescription ?? ''} id="metaDescription" name="metaDescription" rows={2} />
        </div>
        <MediaPicker initialId={initial?.metaImageId} items={mediaItems} label="Social share image" name="metaImage" />
      </section>

      <div className="flex items-center gap-3">
        <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/cities">Cancel</Link>
      </div>
    </form>
  )
}
