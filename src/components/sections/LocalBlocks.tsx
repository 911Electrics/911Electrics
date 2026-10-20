import React from 'react'

import type { RichTextData } from '@/db/types'

import RichText from '@/components/RichText'

export type LocalBlock = { heading: string; body: RichTextData }

/** Short, scannable local-info cards (utility, rebates, permits, neighborhoods). */
export function LocalBlocks({ heading, blocks }: { heading?: string; blocks: LocalBlock[] }) {
  if (!blocks.length) return null
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        {heading && <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">{heading}</h2>}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {blocks.map((b) => (
            <article
              className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6"
              key={b.heading}
            >
              <h3 className="text-lg font-bold text-navy-950">{b.heading}</h3>
              <RichText
                className="prose-sm mt-2 max-w-none prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5"
                data={b.body}
                enableGutter={false}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
