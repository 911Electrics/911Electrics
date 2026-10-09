import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authorize } from '@/lib/api-auth'
import { genId, toLexicalJsonOrEmpty } from '@/lib/api-richtext'
import { slugify } from '@/lib/api-posts'
import { pool, query } from '@/db/client'
import { logAudit } from '@/studio/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function revalidateService(slug: string | null): void {
  revalidateTag('services', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/services')
  revalidatePath('/service-areas')
  revalidatePath(`/${slug ?? ''}`)
  revalidatePath('/')
  revalidatePath('/studio/services')
}

const richText = z.union([z.string(), z.object({ root: z.unknown() }).passthrough()])
const textItem = z.object({ title: z.string().trim().max(200).optional(), text: z.string().trim().max(2000).optional() })
const faqSchema = z.object({ question: z.string().trim().min(1).max(500), answer: richText.optional() })

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    navLabel: z.string().trim().max(120).optional(),
    slug: z.string().trim().max(200).optional(),
    heroSubheading: z.string().trim().max(500).nullable().optional(),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    intro: richText.optional(),
    cardImageId: z.number().int().positive().nullable().optional(),
    heroImageId: z.number().int().positive().nullable().optional(),
    metaImageId: z.number().int().positive().nullable().optional(),
    metaTitle: z.string().trim().max(160).nullable().optional(),
    metaDescription: z.string().trim().max(320).nullable().optional(),
    displayOrder: z.number().int().nullable().optional(),
    showRatingBadge: z.boolean().optional(),
    status: z.enum(['draft', 'published']).optional(),
    benefits: z.array(textItem).max(50).optional(),
    features: z.array(textItem).max(50).optional(),
    faqs: z.array(faqSchema).max(50).optional(),
    galleryImageIds: z.array(z.number().int().positive()).max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

type ServiceRow = {
  id: number
  title: string | null
  nav_label: string | null
  slug: string | null
  hero_subheading: string | null
  short_description: string | null
  intro: string | null
  card_image_id: number | null
  hero_image_id: number | null
  meta_image_id: number | null
  meta_title: string | null
  meta_description: string | null
  display_order: number | null
  show_rating_badge: boolean | null
  status: string | null
}

async function loadService(id: number): Promise<ServiceRow | null> {
  const rows = await query<ServiceRow>(
    `SELECT id, title, nav_label, slug, hero_subheading, short_description,
            intro::text AS intro, card_image_id, hero_image_id, meta_image_id,
            meta_title, meta_description, display_order, show_rating_badge, _status AS status
     FROM services WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

async function replaceTextItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  table: 'services_benefits' | 'services_features',
  id: number,
  items: { title?: string; text?: string }[],
): Promise<void> {
  await client.query(`DELETE FROM ${table} WHERE _parent_id = $1`, [id])
  const clean = items.map((i) => ({ title: i.title ?? '', text: i.text ?? '' })).filter((i) => i.title || i.text)
  for (let i = 0; i < clean.length; i++) {
    await client.query(
      `INSERT INTO ${table} (_order, _parent_id, id, title, text) VALUES ($1,$2,$3,$4,$5)`,
      [i + 1, id, genId(), clean[i].title, clean[i].text],
    )
  }
}

export async function GET(req: Request, { params }: Params) {
  const auth = await authorize(req, 'services:read')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const svc = await loadService(id)
  if (!svc) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  const [benefits, features, faqs, gallery] = await Promise.all([
    query<{ title: string | null; text: string | null }>(`SELECT title, text FROM services_benefits WHERE _parent_id = $1 ORDER BY _order`, [id]),
    query<{ title: string | null; text: string | null }>(`SELECT title, text FROM services_features WHERE _parent_id = $1 ORDER BY _order`, [id]),
    query<{ question: string | null }>(`SELECT question FROM services_faqs WHERE _parent_id = $1 ORDER BY _order`, [id]),
    query<{ image_id: number | null }>(`SELECT image_id FROM services_gallery WHERE _parent_id = $1 ORDER BY _order`, [id]),
  ])
  return NextResponse.json({
    id: svc.id,
    title: svc.title,
    navLabel: svc.nav_label,
    slug: svc.slug,
    status: svc.status,
    heroSubheading: svc.hero_subheading,
    shortDescription: svc.short_description,
    metaTitle: svc.meta_title,
    metaDescription: svc.meta_description,
    displayOrder: svc.display_order,
    showRatingBadge: svc.show_rating_badge,
    benefits: benefits.map((b) => ({ title: b.title, text: b.text })),
    features: features.map((f) => ({ title: f.title, text: f.text })),
    faqs: faqs.map((f) => f.question).filter(Boolean),
    galleryImageIds: gallery.map((g) => g.image_id).filter(Boolean),
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authorize(req, 'services:write')
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
  const d = parsed.data
  const existing = await loadService(id)
  if (!existing) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  const m = <T>(v: T | undefined, fallback: T): T => (v !== undefined ? v : fallback)
  const title = d.title ?? existing.title ?? ''
  const slug = d.slug ? slugify(d.slug) : (existing.slug ?? slugify(title))
  const intro = d.intro !== undefined ? toLexicalJsonOrEmpty(d.intro) : (existing.intro ?? toLexicalJsonOrEmpty(''))

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE services SET
         title=$2, nav_label=$3, slug=$4, hero_subheading=$5, short_description=$6, intro=$7::jsonb,
         card_image_id=$8, hero_image_id=$9, meta_image_id=$10, meta_title=$11, meta_description=$12,
         display_order=$13, show_rating_badge=$14, _status=$15::enum_services_status, updated_at=now()
       WHERE id=$1`,
      [
        id,
        title,
        m(d.navLabel, existing.nav_label ?? title),
        slug,
        m(d.heroSubheading, existing.hero_subheading),
        m(d.shortDescription, existing.short_description),
        intro,
        m(d.cardImageId, existing.card_image_id),
        m(d.heroImageId, existing.hero_image_id),
        m(d.metaImageId, existing.meta_image_id),
        m(d.metaTitle, existing.meta_title),
        m(d.metaDescription, existing.meta_description),
        m(d.displayOrder, existing.display_order),
        m(d.showRatingBadge, existing.show_rating_badge ?? false),
        d.status ?? (existing.status === 'published' ? 'published' : 'draft'),
      ],
    )

    if (d.benefits !== undefined) await replaceTextItems(client, 'services_benefits', id, d.benefits)
    if (d.features !== undefined) await replaceTextItems(client, 'services_features', id, d.features)
    if (d.faqs !== undefined) {
      await client.query(`DELETE FROM services_faqs WHERE _parent_id = $1`, [id])
      for (let i = 0; i < d.faqs.length; i++) {
        await client.query(
          `INSERT INTO services_faqs (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [i + 1, id, genId(), d.faqs[i].question, toLexicalJsonOrEmpty(d.faqs[i].answer)],
        )
      }
    }
    if (d.galleryImageIds !== undefined) {
      await client.query(`DELETE FROM services_gallery WHERE _parent_id = $1`, [id])
      for (let i = 0; i < d.galleryImageIds.length; i++) {
        await client.query(
          `INSERT INTO services_gallery (_order, _parent_id, id, image_id) VALUES ($1,$2,$3,$4)`,
          [i + 1, id, genId(), d.galleryImageIds[i]],
        )
      }
    }

    await client.query('COMMIT')
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: `Slug "${slug}" already exists.` }, { status: 409 })
    }
    console.error('Services API update failed', err)
    return NextResponse.json({ error: 'Could not update the service.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('service.update', { actor: auth.actor, targetType: 'service', targetId: id, summary: `${slug} (API)` })
  revalidateService(existing.slug)
  if (slug !== existing.slug) revalidateService(slug)
  return NextResponse.json({ id, slug })
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await authorize(req, 'services:write')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const existing = await loadService(id)
  if (!existing) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const t of ['services_benefits', 'services_features', 'services_faqs', 'services_gallery']) {
      await client.query(`DELETE FROM ${t} WHERE _parent_id = $1`, [id])
    }
    await client.query(`DELETE FROM services_rels WHERE parent_id = $1`, [id])
    await client.query(`DELETE FROM services WHERE id = $1`, [id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Services API delete failed', err)
    return NextResponse.json({ error: 'Could not delete the service.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('service.delete', { actor: auth.actor, targetType: 'service', targetId: id, summary: existing.slug ?? String(id) })
  revalidateService(existing.slug)
  return NextResponse.json({ id, deleted: true })
}
