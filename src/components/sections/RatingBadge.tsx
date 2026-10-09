import { Star } from 'lucide-react'
import React from 'react'

export function RatingBadge({ value, count }: { value: number; count?: number | null }) {
  if (!count || count <= 0) return null
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-navy-950 shadow">
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            className={i < Math.round(value) ? 'size-4 fill-amber-accent text-amber-accent' : 'size-4 text-border'}
            key={i}
          />
        ))}
      </span>
      <span>
        {value.toFixed(1)} rating{count ? ` · ${count}+ reviews` : ''}
      </span>
    </p>
  )
}
