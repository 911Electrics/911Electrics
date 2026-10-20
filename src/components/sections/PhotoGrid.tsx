import Image from 'next/image'
import React from 'react'

export type GridPhoto = { url: string; caption: string; width: number; height: number }

const COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

/** Compact grid of real job photos with honest captions. */
export function PhotoGrid({ heading, photos }: { heading?: string; photos: GridPhoto[] }) {
  if (!photos.length) return null
  return (
    <section className="py-12">
      <div className="container">
        {heading && <h2 className="text-2xl font-bold text-navy-950 md:text-3xl">{heading}</h2>}
        <div
          className={`mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 ${COLS[Math.min(photos.length, 5)]}`}
        >
          {photos.map((p) => (
            <figure className="flex flex-col" key={p.url}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow">
                <Image
                  alt={p.caption.replace(/\.$/, '')}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                  src={p.url}
                />
              </div>
              <figcaption className="mt-2 text-xs leading-snug text-navy-800 md:text-sm">
                {p.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
