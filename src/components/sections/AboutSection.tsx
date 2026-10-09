import { Award, BadgeCheck, BatteryCharging, CircleCheckBig, ShieldCheck, Zap } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

import type { ImageLike, RichTextData } from '@/db/types'

import RichText from '@/components/RichText'

/** Company licenses & certifications (stable facts, surfaced for trust + EV-rebate lead capture). */
const CREDENTIALS = [
  {
    icon: BadgeCheck,
    title: 'EVITP Certified',
    text: 'Certified by the Electric Vehicle Infrastructure Training Program — required for EV charger installation rebate & incentive programs.',
  },
  {
    icon: ShieldCheck,
    title: 'Class “B” General Building Contractor',
    text: 'Licensed Class “B” General Building Contractor.',
  },
  {
    icon: Zap,
    title: 'C-10 Licensed Electrician',
    text: 'State-licensed C-10 electrical contractor.',
  },
  {
    icon: BatteryCharging,
    title: 'Tesla Certified Installer',
    text: 'Tesla Energy Certified Installer — completed Tesla Energy training for Tesla charging and energy product installations.',
  },
  {
    icon: Award,
    title: 'SCE Certified',
    text: 'Southern California Edison certified contractor — qualified installer for SCE rebate & incentive programs.',
  },
]

export function AboutSection({
  heading,
  body,
  image,
  differentiators,
}: {
  heading?: string | null
  body?: RichTextData | null
  image?: ImageLike | number | null
  differentiators?: { title: string; text: string; id?: string | null }[] | null
}) {
  const hasImage = !!image && typeof image === 'object' && !!image.url

  return (
    <section className="scroll-mt-28 py-16 md:py-20" id="about">
      <div
        className={
          hasImage
            ? 'container grid items-center gap-12 lg:grid-cols-2'
            : 'container max-w-3xl'
        }
      >
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-600 uppercase">
            About Us
          </p>
          <h2 className="text-3xl font-bold text-balance text-navy-950 md:text-4xl">
            {heading || 'Why Choose 911 Construction & Electric'}
          </h2>
          {body && <RichText className="mt-5 max-w-none" data={body} enableGutter={false} />}
          {!!differentiators?.length && (
            <ul className="mt-7 space-y-4">
              {differentiators.map((d, i) => (
                <li className="flex gap-3" key={d.id ?? i}>
                  <CircleCheckBig aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <div>
                    <h3 className="font-semibold text-navy-950">{d.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{d.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
              Licenses &amp; Certifications
            </h3>
            <ul className="mt-4 space-y-4">
              {CREDENTIALS.map((c) => {
                const Icon = c.icon
                return (
                  <li className="flex gap-3" key={c.title}>
                    <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <div>
                      <h4 className="font-semibold text-navy-950">{c.title}</h4>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        {hasImage && typeof image === 'object' && image.url && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
            <Image
              alt={image.alt || ''}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              src={image.url}
            />
          </div>
        )}
      </div>
    </section>
  )
}
