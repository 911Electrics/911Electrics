import { Star } from 'lucide-react'
import React from 'react'

import { SectionHeading } from './SectionHeading'

export type ReviewQuote = { quote: string; name: string; source: string }

/** Verbatim customer reviews with attribution. Only real, verifiable quotes belong here. */
export function ReviewsBlock({ heading, reviews }: { heading?: string; reviews: ReviewQuote[] }) {
  if (!reviews.length) return null
  return (
    <section className="bg-card py-16 md:py-20">
      <div className="container max-w-5xl">
        <SectionHeading eyebrow="Reviews" title={heading || 'What Our Customers Say'} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {reviews.map((r) => (
            <figure
              className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm"
              key={r.name + r.quote.slice(0, 20)}
            >
              <div aria-label="5 out of 5 stars" className="flex gap-0.5" role="img">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star aria-hidden className="size-4 fill-yellow-400 text-yellow-400" key={i} />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-navy-900">&ldquo;{r.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-navy-950">
                {r.name}, <span className="font-normal text-navy-800">{r.source}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-center">
          <a
            className="font-semibold text-brand-700 underline"
            href="https://www.yelp.com/biz/911-construction-and-electric-pasadena"
            rel="noopener noreferrer"
            target="_blank"
          >
            Read all 23 reviews on Yelp
          </a>
        </p>
      </div>
    </section>
  )
}
