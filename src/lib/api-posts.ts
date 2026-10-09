import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'

import { query } from '@/db/client'
import { getCitiesNav } from '@/db/queries'
import type { RichTextData, SerializedLexicalNode } from '@/db/types'
import { autoLinkCities } from '@/lib/auto-link-cities'
import { autoLinkServices } from '@/lib/auto-link-services'

/** WordPress-style slugify, matching the Studio post editor. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Resolve category names/slugs to existing category ids (unknowns ignored). */
export async function resolveCategoryIds(names: string[]): Promise<number[]> {
  if (!names.length) return []
  const rows = await query<{ id: number }>(
    `SELECT id FROM categories
     WHERE lower(slug) = ANY($1::text[]) OR lower(title) = ANY($1::text[])`,
    [names.map((n) => n.toLowerCase())],
  )
  return rows.map((r) => r.id)
}

/**
 * The internal-linking pass every API-written post body goes through: first
 * mention of each core service → its service page, then the city the post is
 * about (and any other served city it names) → that city's page. Both passes
 * skip pages the author already linked, so re-running it on a stored body is
 * safe — it only ever fills gaps.
 *
 * The city list is best-effort: if it cannot be read the post still saves with
 * its service links rather than failing the publish.
 */
export async function autoLinkPostBody(rich: RichTextData, title: string): Promise<RichTextData> {
  const withServices = autoLinkServices(rich)
  try {
    return autoLinkCities(withServices, await getCitiesNav(), { title })
  } catch (err) {
    console.error('City auto-linking skipped', err)
    return withServices
  }
}

/** Number of link nodes in a body — lets the API report what a relink added. */
export function countLinks(rich: RichTextData): number {
  let n = 0
  const walk = (nodes: SerializedLexicalNode[]) => {
    for (const node of nodes) {
      if ((node as { type?: string }).type === 'link') n++
      const children = (node as { children?: SerializedLexicalNode[] }).children
      if (Array.isArray(children)) walk(children)
    }
  }
  if (Array.isArray(rich?.root?.children)) walk(rich.root.children as SerializedLexicalNode[])
  return n
}

/** Bust the public + Studio caches for a post (and the blog/sitemap). */
export function revalidatePost(slug: string | null): void {
  revalidateTag('posts', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/blog')
  if (slug) revalidatePath(`/${slug}`)
  revalidatePath('/studio/posts')
}
