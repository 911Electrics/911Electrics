'use client'

import { useState } from 'react'

import type { MediaItem } from '@/studio/media'

import { MediaUploadBar } from './MediaUploadBar'

export function MediaPicker({
  name,
  label,
  items,
  initialId,
}: {
  name: string
  label: string
  items: MediaItem[]
  initialId?: number | null
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null)
  const [open, setOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(items)
  const selected = mediaItems.find((m) => m.id === selectedId) ?? null

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="text-slate-400">(optional)</span>
      </span>
      <input name={name} type="hidden" value={selectedId ?? ''} />

      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={selected.alt ?? ''} className="size-full object-cover" src={selected.thumb} />
          ) : (
            <span className="text-xs text-slate-400">None</span>
          )}
        </div>
        <button
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          onClick={() => setOpen(true)}
          type="button"
        >
          {selected ? 'Change' : 'Choose image'}
        </button>
        {selected && (
          <button
            className="text-sm font-medium text-red-600 hover:text-red-700"
            onClick={() => setSelectedId(null)}
            type="button"
          >
            Remove
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="font-semibold text-slate-900">Choose an image</h3>
              <button
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <MediaUploadBar
              onUploaded={(item) => {
                setMediaItems((prev) => [item, ...prev])
                setSelectedId(item.id)
                setOpen(false)
              }}
            />
            <div className="grid grid-cols-3 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
              {mediaItems.map((m) => (
                <button
                  className={`overflow-hidden rounded-lg border-2 transition hover:opacity-90 ${
                    m.id === selectedId ? 'border-brand-500' : 'border-transparent'
                  }`}
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id)
                    setOpen(false)
                  }}
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
    </div>
  )
}
