import { Star } from 'lucide-react'
import React from 'react'

import { SectionHeading } from './SectionHeading'

const sourceLabels: Record<string, string> = {
  google: 'Google review',
  yelp: 'Yelp review',
  facebook: 'Facebook review',
  direct: 'Verified customer',
}

/**
 * Minimal shape this carousel renders — satisfied by both the DB-layer
 * Testimonial and Payload's (city-doc relationship) Testimonial during the
 * migration, so it's decoupled from either source.
 */
export type TestimonialCardData = {
  id: number | string
  authorName: string
  location?: string | null
  rating: number
  text: string
  source?: string | null
}

/**
 * CSS scroll-snap carousel — no client JS, swipes natively on mobile and
 * scrolls horizontally with the wheel/trackpad on desktop.
 */
export function TestimonialCarousel({
  heading,
  testimonials,
}: {
  heading?: string | null
  testimonials: TestimonialCardData[]
}) {
  if (!testimonials.length) return null

  return (
    <section className="scroll-mt-28 bg-navy-950 py-16 md:py-20" id="reviews">
      <div className="container">
        <SectionHeading dark eyebrow="Customer Feedback" title={heading || 'What Our Customers Say'} />
      </div>
      <div className="container mt-12">
        <ul className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]">
          {testimonials.map((t) => (
            <li
              className="w-[85%] shrink-0 snap-start rounded-xl bg-white p-7 shadow sm:w-[45%] lg:w-[31%]"
              key={t.id}
            >
              <p aria-label={`${t.rating} out of 5 stars`} className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    aria-hidden
                    className={i < t.rating ? 'size-4 fill-amber-accent text-amber-accent' : 'size-4 text-border'}
                    key={i}
                  />
                ))}
              </p>
              <blockquote className="mt-4 text-sm leading-relaxed text-navy-900">
                “{t.text}”
              </blockquote>
              <footer className="mt-5">
                <p className="font-semibold text-navy-950">{t.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {[t.location, t.source ? sourceLabels[t.source] : null].filter(Boolean).join(' · ')}
                </p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
