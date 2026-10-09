import { CircleCheckBig } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

import { SectionHeading } from './SectionHeading'

/**
 * Generic 3-up blocks: service features, benefits, "why choose us"
 * differentiators.
 */
export function FeatureBlocks({
  eyebrow,
  heading,
  items,
  tone = 'light',
}: {
  eyebrow?: string | null
  heading?: string | null
  items?: { title: string; text: string; id?: string | null }[] | null
  tone?: 'light' | 'card'
}) {
  if (!items?.length) return null

  return (
    <section className={cn('py-16 md:py-20', tone === 'card' ? 'bg-card' : '')}>
      <div className="container">
        {heading && <SectionHeading eyebrow={eyebrow} title={heading} />}
        <div className={cn('grid gap-8', heading ? 'mt-12' : '', items.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
          {items.map((item, i) => (
            <div className="flex gap-4" key={item.id ?? i}>
              <CircleCheckBig aria-hidden className="mt-1 size-6 shrink-0 text-brand-600" />
              <div>
                <h3 className="text-lg font-semibold text-navy-950">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
