import { ChevronDown } from 'lucide-react'
import React from 'react'

import type { RichTextData } from '@/db/types'

import RichText from '@/components/RichText'

import { SectionHeading } from './SectionHeading'

export type FAQ = {
  question: string
  answer: RichTextData
  id?: string | null
}

/**
 * Native <details>/<summary> accordion — zero JS, accessible by default.
 * Pair with FAQPage JSON-LD built from the same data.
 */
export function FAQAccordion({ heading, faqs }: { heading?: string | null; faqs?: FAQ[] | null }) {
  if (!faqs?.length) return null

  return (
    <section className="py-16 md:py-20">
      <div className="container max-w-4xl">
        <SectionHeading eyebrow="FAQ" title={heading || 'Frequently Asked Questions'} />
        <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-white">
          {faqs.map((faq, i) => (
            <details className="group" key={faq.id ?? i} name="faq">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-semibold text-navy-950 marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-brand-600 transition group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-5">
                <RichText className="max-w-none text-sm" data={faq.answer} enableGutter={false} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
