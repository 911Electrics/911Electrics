'use client'

import { useRef, useState, useTransition } from 'react'

import { uploadMedia } from '@/app/actions/studio-media'
import type { MediaItem } from '@/studio/media'

/** Upload-new-image control for the media pickers. Calls onUploaded on success. */
export function MediaUploadBar({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const altRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Choose an image first.')
      return
    }
    const fd = new FormData()
    fd.set('file', file)
    fd.set('alt', altRef.current?.value ?? '')
    setError(null)
    start(async () => {
      const res = await uploadMedia(fd)
      if (res.ok) {
        onUploaded(res.item)
        if (fileRef.current) fileRef.current.value = ''
        if (altRef.current) altRef.current.value = ''
      } else {
        setError(res.error)
      }
    })
  }

  const inputCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className={`${inputCls} max-w-[16rem]`} ref={fileRef} type="file" />
        <input className={`${inputCls} flex-1`} placeholder="Alt text (required)" ref={altRef} type="text" />
        <button
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending}
          onClick={submit}
          type="button"
        >
          {pending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
