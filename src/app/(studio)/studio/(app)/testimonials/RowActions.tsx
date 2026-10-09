'use client'

import Link from 'next/link'
import { useTransition } from 'react'

import { deleteTestimonial, setTestimonialFeatured } from '@/app/actions/studio-testimonials'

export function TestimonialRowActions({ id, featured }: { id: number; featured: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
          featured
            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
        disabled={pending}
        onClick={() => startTransition(() => setTestimonialFeatured(id, !featured))}
        title={featured ? 'Showing on site — click to unfeature' : 'Click to feature on site'}
        type="button"
      >
        {featured ? '★ Featured' : '☆ Feature'}
      </button>
      <Link
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
        href={`/studio/testimonials/${id}`}
      >
        Edit
      </Link>
      <button
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this review? This cannot be undone.')) {
            startTransition(() => deleteTestimonial(id))
          }
        }}
        type="button"
      >
        Delete
      </button>
    </div>
  )
}
