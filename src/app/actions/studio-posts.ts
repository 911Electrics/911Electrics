'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { pool } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { requireActionPermission } from '@/studio/auth'
import { zonedInputToUtc } from '@/lib/business-time'

export type PostFormState = { error?: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type ParsedPost = {
  title: string
  slug: string
  content: string
  heroImageId: number | null
  metaTitle: string | null
  metaDescription: string | null
  metaImageId: number | null
  publishedAt: string | null
  /** Persisted Payload status. "Scheduled" is a draft with scheduledFor set. */
  status: 'draft' | 'published'
  scheduledFor: string | null
  categoryIds: number[]
}

function idOrNull(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parse(form: FormData): ParsedPost {
  const title = String(form.get('title') ?? '').trim()
  if (!title) throw new Error('Title is required.')

  const slugInput = String(form.get('slug') ?? '').trim()
  const slug = slugify(slugInput || title)
  if (!slug) throw new Error('Could not derive a URL slug — please set one.')

  const contentRaw = String(form.get('content') ?? '')
  let content: string
  try {
    const parsed = JSON.parse(contentRaw)
    if (!parsed || typeof parsed !== 'object' || !('root' in parsed)) throw new Error()
    content = JSON.stringify(parsed)
  } catch {
    throw new Error('The post content could not be read.')
  }

  const statusInput = String(form.get('status') ?? 'draft')

  const publishedRaw = String(form.get('publishedAt') ?? '').trim()
  // A datetime-local value has no zone; it means Pacific wall time, not the
  // server's UTC (see lib/business-time).
  const chosenDate: Date | null = publishedRaw ? zonedInputToUtc(publishedRaw) : null
  if (publishedRaw && !chosenDate) throw new Error('That publish date could not be read.')

  let status: 'draft' | 'published' = 'draft'
  let publishedAt: string | null = null
  let scheduledFor: string | null = null

  if (statusInput === 'published') {
    status = 'published'
    publishedAt = (chosenDate ?? new Date()).toISOString()
  } else if (statusInput === 'scheduled') {
    if (!chosenDate) throw new Error('Pick a date and time to schedule this post.')
    if (chosenDate.getTime() <= Date.now()) {
      // Scheduled in the past — just publish it now.
      status = 'published'
      publishedAt = chosenDate.toISOString()
    } else {
      // Stays a hidden draft until the cron publishes it at this time.
      status = 'draft'
      scheduledFor = chosenDate.toISOString()
      publishedAt = chosenDate.toISOString()
    }
  } else {
    status = 'draft'
    publishedAt = chosenDate ? chosenDate.toISOString() : null
  }

  const categoryIds = form
    .getAll('categories')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))

  return {
    title,
    slug,
    content,
    heroImageId: idOrNull(form, 'heroImage'),
    metaTitle: String(form.get('metaTitle') ?? '').trim() || null,
    metaDescription: String(form.get('metaDescription') ?? '').trim() || null,
    metaImageId: idOrNull(form, 'metaImage'),
    publishedAt,
    status,
    scheduledFor,
    categoryIds,
  }
}

/** Snapshot the saved post into post_revisions (keeps the latest 30). */
async function snapshotRevision(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  postId: number,
  data: { title: string; content: string; status: string },
  author: { id: number; name: string | null; email: string },
  note: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO post_revisions (post_id, title, content, status, author_id, author_name, note)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
    [postId, data.title, data.content, data.status, author.id, author.name || author.email, note],
  )
  await client.query(
    `DELETE FROM post_revisions WHERE post_id = $1 AND id NOT IN (
       SELECT id FROM post_revisions WHERE post_id = $1 ORDER BY created_at DESC, id DESC LIMIT 30
     )`,
    [postId],
  )
}

async function writeCategoryRels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  postId: number,
  categoryIds: number[],
): Promise<void> {
  await client.query(`DELETE FROM posts_rels WHERE parent_id = $1 AND path = 'categories'`, [postId])
  for (let i = 0; i < categoryIds.length; i++) {
    await client.query(
      `INSERT INTO posts_rels ("order", parent_id, path, categories_id) VALUES ($1, $2, 'categories', $3)`,
      [i + 1, postId, categoryIds[i]],
    )
  }
}

function revalidatePost(slug: string): void {
  revalidateTag('posts', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/blog')
  revalidatePath(`/${slug}`)
  revalidatePath('/studio/posts')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): string {
  if (err?.code === '23505') return 'A post with that URL slug already exists. Choose a different slug.'
  return err instanceof Error ? err.message : 'Could not save the post.'
}

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireActionPermission('content')

  let data: ParsedPost
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the post.' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO posts
         (title, slug, content, hero_image_id, meta_title, meta_description, meta_image_id,
          published_at, scheduled_for, _status, generate_slug, updated_at, created_at)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::enum_posts_status,false,now(),now())
       RETURNING id`,
      [
        data.title,
        data.slug,
        data.content,
        data.heroImageId,
        data.metaTitle,
        data.metaDescription,
        data.metaImageId,
        data.publishedAt,
        data.scheduledFor,
        data.status,
      ],
    )
    await writeCategoryRels(client, rows[0].id, data.categoryIds)
    await snapshotRevision(client, rows[0].id, data, user, 'Created')
    await client.query('COMMIT')
    await logAudit('post.create', { targetType: 'post', targetId: rows[0].id, summary: data.title })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: dbError(err) }
  } finally {
    client.release()
  }

  revalidatePost(data.slug)
  redirect('/studio/posts')
}

export async function updatePost(
  id: number,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await requireActionPermission('content')

  let data: ParsedPost
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the post.' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE posts SET
         title=$2, slug=$3, content=$4::jsonb, hero_image_id=$5,
         meta_title=$6, meta_description=$7, meta_image_id=$8,
         published_at=$9, scheduled_for=$10, _status=$11::enum_posts_status, updated_at=now()
       WHERE id=$1`,
      [
        id,
        data.title,
        data.slug,
        data.content,
        data.heroImageId,
        data.metaTitle,
        data.metaDescription,
        data.metaImageId,
        data.publishedAt,
        data.scheduledFor,
        data.status,
      ],
    )
    await writeCategoryRels(client, id, data.categoryIds)
    await snapshotRevision(client, id, data, user, 'Edited')
    await client.query('COMMIT')
    await logAudit('post.update', { targetType: 'post', targetId: id, summary: data.title })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: dbError(err) }
  } finally {
    client.release()
  }

  revalidatePost(data.slug)
  redirect('/studio/posts')
}

export async function deletePost(id: number, slug: string): Promise<void> {
  await requireActionPermission('content')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM posts_rels WHERE parent_id = $1`, [id])
    await client.query(`DELETE FROM posts WHERE id = $1`, [id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }

  await logAudit('post.delete', { targetType: 'post', targetId: id, summary: slug })
  revalidatePost(slug)
}

/** Roll a post back to a stored revision's title/content/status. */
export async function restorePostRevision(postId: number, revisionId: number): Promise<void> {
  const user = await requireActionPermission('content')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{
      title: string | null
      content: string
      status: string | null
      slug: string | null
    }>(
      `SELECT r.title, r.content::text AS content, r.status, p.slug
       FROM post_revisions r JOIN posts p ON p.id = r.post_id
       WHERE r.id = $1 AND r.post_id = $2`,
      [revisionId, postId],
    )
    const rev = rows[0]
    if (!rev) throw new Error('Revision not found')

    const status = rev.status === 'published' ? 'published' : 'draft'
    await client.query(
      `UPDATE posts SET title = $2, content = $3::jsonb, _status = $4::enum_posts_status,
         scheduled_for = NULL, updated_at = now()
       WHERE id = $1`,
      [postId, rev.title, rev.content, status],
    )
    await snapshotRevision(
      client,
      postId,
      { title: rev.title ?? '', content: rev.content, status },
      user,
      'Restored',
    )
    await client.query('COMMIT')
    await logAudit('post.restore', { targetType: 'post', targetId: postId, summary: `Restored revision #${revisionId}` })
    revalidatePost(rev.slug ?? '')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
