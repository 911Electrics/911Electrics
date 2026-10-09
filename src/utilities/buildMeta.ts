import type { Metadata } from 'next'

import type { MediaImage } from '@/db/types'

import { getServerSideURL } from './getURL'
import { mergeOpenGraph } from './mergeOpenGraph'

const SITE_NAME = '911 Construction & Electric Inc.'

/** Build page metadata from a DB-layer SEO shape (title/description/image). */
export function buildMeta({
  title,
  description,
  image,
  path,
  fallbackTitle,
}: {
  title?: string | null
  description?: string | null
  image?: MediaImage | null
  path: string
  fallbackTitle?: string | null
}): Metadata {
  const resolvedTitle = title || fallbackTitle || SITE_NAME
  const ogPath = image?.sizes?.og ?? image?.url
  return {
    title: resolvedTitle,
    description: description ?? undefined,
    alternates: { canonical: path },
    openGraph: mergeOpenGraph({
      description: description ?? '',
      images: ogPath ? [{ url: getServerSideURL() + ogPath }] : undefined,
      title: resolvedTitle,
      url: path,
    }),
  }
}
