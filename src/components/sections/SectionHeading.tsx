import React from 'react'

import { cn } from '@/utilities/ui'

export function SectionHeading({
  align = 'center',
  eyebrow,
  title,
  subtitle,
  dark = false,
}: {
  align?: 'left' | 'center'
  eyebrow?: string | null
  title: string
  subtitle?: string | null
  dark?: boolean
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : '')}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand-600 uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className={cn('text-3xl font-bold text-balance md:text-4xl', dark ? 'text-white' : 'text-navy-950')}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-4 text-lg', dark ? 'text-white/80' : 'text-muted-foreground')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
