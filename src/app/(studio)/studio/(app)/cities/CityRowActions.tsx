'use client'

import Link from 'next/link'
import { useTransition } from 'react'

import { deleteCity } from '@/app/actions/studio-cities'

export function CityRowActions({
  id,
  slug,
  pathOverride,
}: {
  id: number
  slug: string | null
  pathOverride: string | null
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
        href={`/studio/cities/${id}`}
      >
        Edit
      </Link>
      <button
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this service area? This cannot be undone.')) {
            startTransition(() => deleteCity(id, slug ?? '', pathOverride))
          }
        }}
        type="button"
      >
        Delete
      </button>
    </div>
  )
}
