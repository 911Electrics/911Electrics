import React from 'react'

import { SectionHeading } from './SectionHeading'

export function ProcessSteps({
  heading,
  steps,
}: {
  heading?: string | null
  steps?: { title: string; text: string; id?: string | null }[] | null
}) {
  if (!steps?.length) return null

  return (
    <section className="bg-card py-16 md:py-20">
      <div className="container">
        <SectionHeading eyebrow="How It Works" title={heading || 'From Consultation to Completion in 3 Easy Steps'} />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li className="relative rounded-xl bg-white p-7 shadow-sm" key={step.id ?? i}>
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-navy-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
