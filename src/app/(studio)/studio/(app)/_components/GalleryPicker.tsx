'use client'

import { useState } from 'react'

import type { MediaItem } from '@/studio/media'

import { MediaUploadBar } from './MediaUploadBar'

export function GalleryPicker({
  name,
  label,
  items,
  initialIds,
}: {
  name: string
  label: string
  items: MediaItem[]
  initialIds?: number[]
}) {
  const [ids, setIds] = useState<number[]>(initialIds ?? [])
  const [open, setOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(items)
  const byId = new Map(mediaItems.map((m) => [m.id, m]))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
      <input name={name} type="hidden" value={JSON.stringify(ids)} />

      <div className="flex flex-wrap gap-3">
        {ids.map((id, i) => {
          const m = byId.get(id)
          return (
            <div className="relative size-20 overflow-hidden rounded-lg border border-slate-200" key={`${id}-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={m?.alt ?? ''} className="size-full object-cover" src={m?.thumb ?? ''} />
              <button
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-slate-900/70 text-xs font-bold text-white"
                onClick={() => setIds((prev) => prev.filter((_, idx) => idx !== i))}
                type="button"
              >
                ×
              </button>
            </div>
          )
        })}
        <button
          className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
          onClick={() => setOpen(true)}
          type="button"
        >
          + Add
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="font-semibold text-slate-900">Add images (click to add)</h3>
              <button className="text-sm font-medium text-slate-500 hover:text-slate-700" onClick={() => setOpen(false)} type="button">
                Done
              </button>
            </div>
            <MediaUploadBar
              onUploaded={(item) => {
                setMediaItems((prev) => [item, ...prev])
                setIds((prev) => [...prev, item.id])
              }}
            />
            <div className="grid grid-cols-3 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
              {mediaItems.map((m) => (
                <button
                  className="overflow-hidden rounded-lg border-2 border-transparent transition hover:border-brand-400 hover:opacity-90"
                  key={m.id}
                  onClick={() => setIds((prev) => [...prev, m.id])}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={m.alt ?? ''} className="aspect-square w-full object-cover" src={m.thumb} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
