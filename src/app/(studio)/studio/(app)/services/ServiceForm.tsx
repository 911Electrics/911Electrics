'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { ServiceFormState } from '@/app/actions/studio-services'
import type { MediaItem } from '@/studio/media'
import type { StudioService } from '@/studio/services'
import { RichTextEditor } from '@/studio/editor/RichTextEditor'

import { FaqRepeater } from '../_components/FaqRepeater'
import { GalleryPicker } from '../_components/GalleryPicker'
import { MediaPicker } from '../_components/MediaPicker'
import { TextItemRepeater } from '../_components/TextItemRepeater'

type Action = (prev: ServiceFormState, formData: FormData) => Promise<ServiceFormState>

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

export function ServiceForm({
  action,
  initial,
  mediaItems,
  submitLabel,
}: {
  action: Action
  initial?: StudioService | null
  mediaItems: MediaItem[]
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</div>
      )}

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="title">Title</label>
            <input className={inputCls} defaultValue={initial?.title ?? ''} id="title" name="title" required type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="navLabel">Nav label <span className="text-slate-400">(menu/cards)</span></label>
            <input className={inputCls} defaultValue={initial?.navLabel ?? ''} id="navLabel" name="navLabel" type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">URL slug <span className="text-slate-400">(blank = from title)</span></label>
            <input className={inputCls} defaultValue={initial?.slug ?? ''} id="slug" name="slug" placeholder="ev-charger-installation-los-angeles-ca" type="text" />
          </div>
          <div>
            <label className={labelCls} htmlFor="displayOrder">Display order <span className="text-slate-400">(optional)</span></label>
            <input className={inputCls} defaultValue={initial?.displayOrder ?? ''} id="displayOrder" name="displayOrder" type="number" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="heroSubheading">Hero subheading <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} defaultValue={initial?.heroSubheading ?? ''} id="heroSubheading" name="heroSubheading" type="text" />
        </div>
        <div>
          <label className={labelCls} htmlFor="shortDescription">Short description <span className="text-slate-400">(service card text)</span></label>
          <textarea className={inputCls} defaultValue={initial?.shortDescription ?? ''} id="shortDescription" name="shortDescription" rows={2} />
        </div>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30" defaultChecked={initial?.showRatingBadge ?? false} name="showRatingBadge" type="checkbox" />
          Show the rating badge on the hero
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className={labelCls}>Intro / body</span>
        <RichTextEditor initial={initial?.intro} name="intro" />
      </section>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
        <MediaPicker initialId={initial?.cardImageId} items={mediaItems} label="Card image" name="cardImage" />
        <MediaPicker initialId={initial?.heroImageId} items={mediaItems} label="Hero image" name="heroImage" />
        <div>
          <label className={labelCls} htmlFor="status">Status</label>
          <select className={inputCls} defaultValue={initial?.status ?? 'draft'} id="status" name="status">
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published (live)</option>
          </select>
        </div>
      </section>

      <TextItemRepeater initial={initial?.benefits} label="Benefits" name="benefits" titlePlaceholder="Benefit" />
      <TextItemRepeater initial={initial?.features} label="Features" name="features" titlePlaceholder="Feature" />
      <GalleryPicker initialIds={initial?.galleryImageIds} items={mediaItems} label="Gallery" name="gallery" />
      <FaqRepeater initial={initial?.faqs} label="FAQs" />

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
        <Link className="text-sm font-medium text-slate-500 hover:text-slate-700" href="/studio/services">Cancel</Link>
      </div>
    </form>
  )
}
