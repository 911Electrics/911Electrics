import Image from 'next/image'
import React from 'react'

/**
 * The company logo, served through the image optimizer.
 *
 * It used to be a raw `<img>` pointing at the full-resolution source (a 728×343
 * PNG, ~50 KB) even though it paints at ~44 px tall. In the header it also
 * carried `fetchPriority="high"`, so it competed with the hero image — the
 * page's LCP element — for early bandwidth. Going through `next/image` with an
 * accurate `sizes` serves an AVIF/WebP a fraction of that size.
 *
 * `width`/`height` carry the intrinsic aspect ratio so the box is reserved
 * before the bytes land (no layout shift); the `h-*`/`w-auto` classes are what
 * actually size it, so a Site Settings logo with a different aspect ratio still
 * renders correctly.
 */
const INTRINSIC_WIDTH = 728
const INTRINSIC_HEIGHT = 343

export function SiteLogo({
  alt,
  className,
  priority = false,
  sizes = '104px',
  src,
}: {
  alt: string
  className: string
  /** Set on the header logo only — it is the one that paints above the fold. */
  priority?: boolean
  sizes?: string
  src: string
}) {
  return (
    <Image
      alt={alt}
      className={className}
      height={INTRINSIC_HEIGHT}
      priority={priority}
      sizes={sizes}
      src={src}
      width={INTRINSIC_WIDTH}
    />
  )
}
