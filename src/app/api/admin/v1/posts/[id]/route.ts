import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { RichTextData } from '@/db/types'

import { authorize } from '@/lib/api-auth'
import { ingestImageFromUrl } from '@/lib/api-media'
import {
  autoLinkPostBody,
  countLinks,
  resolveCategoryIds,
  revalidatePost,
  slugify,
} from '@/lib/api-posts'
import { pool, query } from '@/db/client'
import { markdownToLexical } from '@/lib/markdown-to-lexical'
import { logAudit } from '@/studio/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

const patchSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    markdown: z.string().min(1).optional(),
    content: z.object({ root: z.unknown() }).passthrough().optional(),
    slug: z.string().trim().max(200).optional(),
    excerpt: z.string().trim().max(500).optional(),
    metaTitle: z.string().trim().max(120).optional(),
    metaDescription: z.string().trim().max(320).optional(),
    status: z.enum(['draft', 'published']).optional(),
    publishedAt: z.string().datetime().nullable().optional(),
    categories: z.array(z.string().trim().min(1)).max(20).optional(),
    heroImageId: z.number().int().positive().nullable().optional(),
    heroImageUrl: z.string().url().optional(),
    heroImageAlt: z.string().trim().max(300).optional(),
    // Re-run the internal-linking pass over the stored body without replacing
    // it. Idempotent — pages that are already linked are left alone.
    relink: z.boolean().optional(),
    // With `relink`: report what would be added and write nothing.
    dryRun: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

type PostRow = {
  id: number
  title: string | null
  slug: string | null
  content: string
  hero_image_id: number | null
  meta_title: string | null
  meta_description: string | null
  published_at: string | null
  status: string | null
}

async function loadPost(id: number): Promise<PostRow | null> {
  const rows = await query<PostRow>(
    `SELECT id, title, slug, content::text AS content, hero_image_id,
            meta_title, meta_description, published_at, _status AS status
     FROM posts WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function GET(req: Request, { params }: Params) {
  const auth = await authorize(req, 'posts:read')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const post = await loadPost(id)
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })

  const cats = await query<{ title: string | null; slug: string | null }>(
    `SELECT c.title, c.slug FROM posts_rels r JOIN categories c ON c.id = r.categories_id
     WHERE r.parent_id = $1 AND r.path = 'categories' ORDER BY r."order"`,
    [id],
  )
  return NextResponse.json({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    heroImageId: post.hero_image_id,
    publishedAt: post.published_at,
    categories: cats.map((c) => c.title || c.slug).filter(Boolean),
    content: JSON.parse(post.content) as RichTextData,
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authorize(req, 'posts:write')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const data = parsed.data

  const existing = await loadPost(id)
  if (!existing) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })

  // Merge provided fields over the existing row.
  const title = data.title ?? existing.title ?? ''
  const slug = data.slug ? slugify(data.slug) : (existing.slug ?? slugify(title))
  // A replaced body gets the same internal-linking pass as a newly published
  // one (it used to be skipped here, so re-sending a post through PATCH
  // silently dropped its automatic links). `relink` runs that pass over the
  // stored body as-is, which is how existing posts are backfilled.
  const replacement: RichTextData | null = data.content
    ? (data.content as RichTextData)
    : data.markdown
      ? markdownToLexical(data.markdown)
      : null
  const stored = JSON.parse(existing.content) as RichTextData
  const body = replacement ?? stored
  const linked = replacement || data.relink ? await autoLinkPostBody(body, title) : body
  const linksAdded = countLinks(linked) - countLinks(body)

  if (data.dryRun) {
    return NextResponse.json({ id, slug: existing.slug, title, linksAdded, dryRun: true })
  }
  // Nothing else asked for and nothing to add: leave the row, its `updated_at`
  // and its revision history untouched.
  if (data.relink && linksAdded === 0 && Object.keys(data).length === 1) {
    return NextResponse.json({ id, slug: existing.slug, linksAdded: 0, unchanged: true })
  }
  const content = replacement || linksAdded > 0 ? JSON.stringify(linked) : existing.content
  const status = data.status ?? (existing.status === 'published' ? 'published' : 'draft')
  const metaTitle = data.metaTitle ?? existing.meta_title
  const metaDescription = data.metaDescription ?? data.excerpt ?? existing.meta_description

  let publishedAt: string | null = existing.published_at
  if (data.publishedAt !== undefined) publishedAt = data.publishedAt
  if (status === 'published' && !publishedAt) publishedAt = new Date().toISOString()

  let heroImageId = existing.hero_image_id
  if (data.heroImageId !== undefined) heroImageId = data.heroImageId
  if (data.heroImageUrl) {
    try {
      heroImageId = await ingestImageFromUrl(data.heroImageUrl, data.heroImageAlt || title)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Could not ingest hero image.' },
        { status: 422 },
      )
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE posts SET
         title=$2, slug=$3, content=$4::jsonb, hero_image_id=$5,
         meta_title=$6, meta_description=$7, published_at=$8,
         _status=$9::enum_posts_status, updated_at=now()
       WHERE id=$1`,
      [id, title, slug, content, heroImageId, metaTitle, metaDescription, publishedAt, status],
    )

    if (data.categories !== undefined) {
      const categoryIds = await resolveCategoryIds(data.categories)
      await client.query(`DELETE FROM posts_rels WHERE parent_id = $1 AND path = 'categories'`, [id])
      for (let n = 0; n < categoryIds.length; n++) {
        await client.query(
          `INSERT INTO posts_rels ("order", parent_id, path, categories_id) VALUES ($1,$2,'categories',$3)`,
          [n + 1, id, categoryIds[n]],
        )
      }
    }

    await client.query(
      `INSERT INTO post_revisions (post_id, title, content, status, author_id, author_name, note)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)`,
      [id, title, content, status, null, 'Blog API', 'Edited via API'],
    )
    await client.query('COMMIT')
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: `Slug "${slug}" already exists.` }, { status: 409 })
    }
    console.error('Blog API update failed', err)
    return NextResponse.json({ error: 'Could not update the post.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('post.update', { actor: auth.actor, targetType: 'post', targetId: id, summary: `${title} (API)` })
  revalidatePost(existing.slug)
  if (slug !== existing.slug) revalidatePost(slug)

  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
  return NextResponse.json({
    id,
    slug,
    status,
    url: base ? `${base}/${slug}/` : `/${slug}/`,
    publishedAt,
    linksAdded,
  })
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await authorize(req, 'posts:write')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const existing = await loadPost(id)
  if (!existing) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM posts_rels WHERE parent_id = $1`, [id])
    await client.query(`DELETE FROM post_revisions WHERE post_id = $1`, [id])
    await client.query(`DELETE FROM posts WHERE id = $1`, [id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Blog API delete failed', err)
    return NextResponse.json({ error: 'Could not delete the post.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('post.delete', { actor: auth.actor, targetType: 'post', targetId: id, summary: existing.slug ?? String(id) })
  revalidatePost(existing.slug)
  return NextResponse.json({ id, deleted: true })
}
