import Link from 'next/link'

import { TESTIMONIAL_SOURCE_LABEL } from '@/studio/constants'
import { getAllTestimonials } from '@/studio/testimonials'

import { TestimonialRowActions } from './RowActions'

export const dynamic = 'force-dynamic'

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} of 5 stars`} className="text-amber-500">
      {'★'.repeat(rating)}
      <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

export default async function StudioTestimonialsPage() {
  const items = await getAllTestimonials()
  const featuredCount = items.filter((t) => t.featured).length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} review{items.length === 1 ? '' : 's'} · {featuredCount} featured on the
            website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            href="/studio/testimonials/google"
          >
            Google reviews
          </Link>
          <Link
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            href="/studio/testimonials/new"
          >
            New review
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          No reviews yet. Add your first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li className="flex items-start gap-3 px-5 py-4" key={t.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Stars rating={t.rating} />
                    <span className="font-medium text-slate-900">{t.authorName}</span>
                    {t.location && <span className="text-slate-400">· {t.location}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.text}</p>
                  <div className="mt-1 text-xs text-slate-400">
                    {t.source ? TESTIMONIAL_SOURCE_LABEL[t.source] : 'Manual entry'}
                    {t.date ? ` · ${new Date(t.date).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <TestimonialRowActions featured={t.featured} id={t.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
