import 'server-only'

import { unstable_cache } from 'next/cache'

import { query } from '@/db/client'
import { getCitiesNav, getMediaByIds } from '@/db/queries'
import type { MediaImage, RichTextData } from '@/db/types'
import { citiesMentionedIn } from '@/lib/auto-link-cities'
import { nodePlainText, readingTime } from '@/lib/blog'

export type PostSummary = {
  id: number
  title: string
  slug: string
  heroImage: MediaImage | null
  categoryTitle: string | null
  publishedAt: string | null
  readingMinutes: number
  excerpt: string
}

export type PostDetail = {
  id: number
  title: string
  slug: string
  content: RichTextData | null
  heroImage: MediaImage | null
  publishedAt: string | null
  updatedAt: string | null
  categories: { id: number; title: string; slug: string }[]
  meta: { title: string | null; description: string | null; image: MediaImage | null }
}

type PostRow = {
  id: number
  title: string | null
  slug: string | null
  content: RichTextData | null
  hero_image_id: number | null
  published_at: string | null
}

function excerptOf(content: RichTextData | null): string {
  const root = content?.root as Parameters<typeof nodePlainText>[0]
  const text = nodePlainText(root)
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text
}

/** Map post rows to summaries: resolves hero media + first category in batch. */
async function toSummaries(rows: PostRow[]): Promise<PostSummary[]> {
  if (rows.length === 0) return []
  const media = await getMediaByIds(
    rows.map((r) => r.hero_image_id).filter((n): n is number => typeof n === 'number'),
  )
  const cats = await query<{ parent_id: number; title: string | null }>(
    `SELECT pr.parent_id, c.title
     FROM posts_rels pr JOIN categories c ON c.id = pr.categories_id
     WHERE pr.path = 'categories' AND pr.parent_id = ANY($1)
     ORDER BY pr."order"`,
    [rows.map((r) => r.id)],
  )
  const firstCat = new Map<number, string>()
  for (const c of cats) if (!firstCat.has(c.parent_id) && c.title) firstCat.set(c.parent_id, c.title)

  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    slug: r.slug ?? '',
    heroImage: r.hero_image_id ? (media.get(r.hero_image_id) ?? null) : null,
    categoryTitle: firstCat.get(r.id) ?? null,
    publishedAt: r.published_at,
    readingMinutes: readingTime(r.content),
    excerpt: excerptOf(r.content),
  }))
}

export const getPublishedPosts = unstable_cache(
  async (opts?: { limit?: number; offset?: number; categorySlug?: string; excludeId?: number }) => {
    const { limit, offset = 0, categorySlug, excludeId } = opts ?? {}
    const conds: string[] = [`p._status = 'published'`]
    const params: unknown[] = []
    if (categorySlug) {
      params.push(categorySlug)
      conds.push(
        `EXISTS (SELECT 1 FROM posts_rels pr JOIN categories c ON c.id = pr.categories_id
                 WHERE pr.parent_id = p.id AND pr.path = 'categories' AND c.slug = $${params.length})`,
      )
    }
    if (excludeId) {
      params.push(excludeId)
      conds.push(`p.id <> $${params.length}`)
    }
    const where = conds.join(' AND ')
    const total = (
      await query<{ count: string }>(`SELECT count(*)::text FROM posts p WHERE ${where}`, params)
    )[0]
    let sql = `SELECT p.id, p.title, p.slug, p.content, p.hero_image_id, p.published_at
               FROM posts p WHERE ${where}
               ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC`
    if (typeof limit === 'number') {
      params.push(limit, offset)
      sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`
    }
    const rows = await query<PostRow>(sql, params)
    return { posts: await toSummaries(rows), total: Number(total?.count ?? 0) }
  },
  ['db-published-posts'],
  { tags: ['posts'] },
)

export const getPostBySlug = unstable_cache(
  async (slug: string): Promise<PostDetail | null> => {
    const rows = await query<{
      id: number
      title: string | null
      slug: string | null
      content: RichTextData | null
      hero_image_id: number | null
      published_at: string | null
      updated_at: string | null
      meta_title: string | null
      meta_description: string | null
      meta_image_id: number | null
    }>(
      `SELECT id, title, slug, content, hero_image_id, published_at, updated_at,
              meta_title, meta_description, meta_image_id
       FROM posts WHERE slug = $1 AND _status = 'published' LIMIT 1`,
      [slug],
    )
    const p = rows[0]
    if (!p) return null

    const cats = await query<{ id: number; title: string | null; slug: string | null }>(
      `SELECT c.id, c.title, c.slug FROM posts_rels pr JOIN categories c ON c.id = pr.categories_id
       WHERE pr.parent_id = $1 AND pr.path = 'categories' ORDER BY pr."order"`,
      [p.id],
    )
    const media = await getMediaByIds(
      [p.hero_image_id, p.meta_image_id].filter((n): n is number => typeof n === 'number'),
    )
    return {
      id: p.id,
      title: p.title ?? '',
      slug: p.slug ?? '',
      content: p.content,
      heroImage: p.hero_image_id ? (media.get(p.hero_image_id) ?? null) : null,
      publishedAt: p.published_at,
      updatedAt: p.updated_at,
      categories: cats.map((c) => ({ id: c.id, title: c.title ?? '', slug: c.slug ?? '' })),
      meta: {
        title: p.meta_title,
        description: p.meta_description,
        image: p.meta_image_id ? (media.get(p.meta_image_id) ?? null) : null,
      },
    }
  },
  ['db-post-by-slug'],
  { tags: ['posts'] },
)

export const getAdjacentPost = unstable_cache(
  async (publishedAt: string | null, id: number, dir: 'older' | 'newer'): Promise<PostSummary | null> => {
    if (!publishedAt) return null
    const cmp = dir === 'older' ? '<' : '>'
    const order = dir === 'older' ? 'DESC' : 'ASC'
    const rows = await query<PostRow>(
      `SELECT id, title, slug, content, hero_image_id, published_at FROM posts
       WHERE _status='published' AND id <> $2 AND published_at ${cmp} $1
       ORDER BY published_at ${order} LIMIT 1`,
      [publishedAt, id],
    )
    return (await toSummaries(rows))[0] ?? null
  },
  ['db-adjacent-post'],
  { tags: ['posts'] },
)

export const getRelatedPosts = unstable_cache(
  async (postId: number, categoryIds: number[]): Promise<PostSummary[]> => {
    if (categoryIds.length === 0) return []
    const rows = await query<PostRow>(
      `SELECT DISTINCT p.id, p.title, p.slug, p.content, p.hero_image_id, p.published_at
       FROM posts p JOIN posts_rels pr ON pr.parent_id = p.id
       WHERE p._status='published' AND p.id <> $1
         AND pr.path='categories' AND pr.categories_id = ANY($2)
       ORDER BY p.published_at DESC NULLS LAST LIMIT 3`,
      [postId, categoryIds],
    )
    return toSummaries(rows)
  },
  ['db-related-posts'],
  { tags: ['posts'] },
)

/**
 * Published posts written *about* a city — the city is named in the title
 * ("Highland Park Electrician in Los Angeles: Panel Upgrades"). Shown on that
 * city's page so the page and the articles that rank alongside it link to each
 * other instead of competing as strangers.
 *
 * SQL does the cheap substring cut; `citiesMentionedIn` then applies the same
 * name guards as the auto-linker, so a "South Pasadena" article is not offered
 * on the Pasadena page.
 */
export const getPostsForCity = unstable_cache(
  async (cityName: string, limit = 3): Promise<PostSummary[]> => {
    const name = cityName.trim()
    if (!name) return []
    const [rows, cities] = await Promise.all([
      query<PostRow>(
        `SELECT id, title, slug, content, hero_image_id, published_at FROM posts
         WHERE _status='published' AND position(lower($1) in lower(title)) > 0
         ORDER BY published_at DESC NULLS LAST LIMIT 24`,
        [name],
      ),
      getCitiesNav(),
    ])
    const about = rows.filter((r) =>
      citiesMentionedIn(r.title ?? '', cities).some((c) => c.cityName.trim() === name),
    )
    return toSummaries(about.slice(0, limit))
  },
  ['db-posts-for-city'],
  { tags: ['posts', 'cities'] },
)

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<{ id: number; title: string; slug: string } | null> => {
    const rows = await query<{ id: number; title: string | null; slug: string | null }>(
      `SELECT id, title, slug FROM categories WHERE slug = $1 LIMIT 1`,
      [slug],
    )
    const c = rows[0]
    return c ? { id: c.id, title: c.title ?? '', slug: c.slug ?? '' } : null
  },
  ['db-category-by-slug'],
  { tags: ['categories'] },
)

export type CategoryWithCount = { id: number; title: string; slug: string; count: number }

export const getCategoriesWithCounts = unstable_cache(
  async (): Promise<CategoryWithCount[]> => {
    const rows = await query<{ id: number; title: string | null; slug: string | null; count: string }>(
      `SELECT c.id, c.title, c.slug,
              (SELECT count(*) FROM posts_rels pr JOIN posts p ON p.id = pr.parent_id
               WHERE pr.categories_id = c.id AND pr.path = 'categories' AND p._status = 'published')::text AS count
       FROM categories c ORDER BY c.title`,
    )
    return rows.map((c) => ({
      id: c.id,
      title: c.title ?? '',
      slug: c.slug ?? '',
      count: Number(c.count),
    }))
  },
  ['db-categories-with-counts'],
  { tags: ['posts', 'categories'] },
)
