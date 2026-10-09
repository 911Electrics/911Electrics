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

const richText = z.union([z.string(), z.object({ root: z.unknown() }).passthrough()])
const textItem = z.object({ title: z.string().trim().max(200).optional(), text: z.string().trim().max(2000).optional() })
const faqSchema = z.object({ question: z.string().trim().min(1).max(500), answer: richText.optional() })

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  navLabel: z.string().trim().max(120).optional(),
  slug: z.string().trim().max(200).optional(),
  heroSubheading: z.string().trim().max(500).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  intro: richText.optional(),
  cardImageId: z.number().int().positive().optional(),
  heroImageId: z.number().int().positive().optional(),
  metaImageId: z.number().int().positive().optional(),
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  displayOrder: z.number().int().optional(),
  showRatingBadge: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
  benefits: z.array(textItem).max(50).optional(),
  features: z.array(textItem).max(50).optional(),
  faqs: z.array(faqSchema).max(50).optional(),
  galleryImageIds: z.array(z.number().int().positive()).max(50).optional(),
})

function revalidateService(slug: string): void {
  revalidateTag('services', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/services')
  revalidatePath('/service-areas')
  revalidatePath(`/${slug}`)
  revalidatePath('/')
  revalidatePath('/studio/services')
}

export async function GET(req: Request) {
  const auth = await authorize(req, 'services:read')
  if (!auth.ok) return auth.response

  const rows = await query<{
    id: number
    title: string | null
    nav_label: string | null
    slug: string | null
    status: string | null
    display_order: number | null
  }>(
    `SELECT id, title, nav_label, slug, _status AS status, display_order
     FROM services ORDER BY display_order NULLS LAST, id LIMIT 200`,
  )
  return NextResponse.json({
    count: rows.length,
    services: rows.map((r) => ({
      id: r.id,
      title: r.title,
      navLabel: r.nav_label,
      slug: r.slug,
      status: r.status,
      displayOrder: r.display_order,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await authorize(req, 'services:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const d = parsed.data

  const slug = slugify(d.slug || d.title)
  if (!slug) return NextResponse.json({ error: 'Could not derive a URL slug.' }, { status: 422 })

  const benefits = (d.benefits ?? []).map((b) => ({ title: b.title ?? '', text: b.text ?? '' })).filter((b) => b.title || b.text)
  const features = (d.features ?? []).map((f) => ({ title: f.title ?? '', text: f.text ?? '' })).filter((f) => f.title || f.text)

  const client = await pool.connect()
  let id: number
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO services
         (title, nav_label, slug, hero_subheading, short_description, intro,
          card_image_id, hero_image_id, meta_image_id, meta_title, meta_description,
          display_order, show_rating_badge, _status, generate_slug, updated_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14::enum_services_status,false,now(),now())
       RETURNING id`,
      [
        d.title,
        d.navLabel || d.title,
        slug,
        d.heroSubheading ?? null,
        d.shortDescription ?? null,
        toLexicalJsonOrEmpty(d.intro),
        d.cardImageId ?? null,
        d.heroImageId ?? null,
        d.metaImageId ?? null,
        d.metaTitle ?? null,
        d.metaDescription ?? null,
        d.displayOrder ?? null,
        d.showRatingBadge ?? false,
        d.status ?? 'draft',
      ],
    )
    id = rows[0].id

    for (let i = 0; i < benefits.length; i++) {
      await client.query(
        `INSERT INTO services_benefits (_order, _parent_id, id, title, text) VALUES ($1,$2,$3,$4,$5)`,
        [i + 1, id, genId(), benefits[i].title, benefits[i].text],
      )
    }
    for (let i = 0; i < features.length; i++) {
      await client.query(
        `INSERT INTO services_features (_order, _parent_id, id, title, text) VALUES ($1,$2,$3,$4,$5)`,
        [i + 1, id, genId(), features[i].title, features[i].text],
      )
    }
    const faqs = d.faqs ?? []
    for (let i = 0; i < faqs.length; i++) {
      await client.query(
        `INSERT INTO services_faqs (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [i + 1, id, genId(), faqs[i].question, toLexicalJsonOrEmpty(faqs[i].answer)],
      )
    }
    const gallery = d.galleryImageIds ?? []
    for (let i = 0; i < gallery.length; i++) {
      await client.query(
        `INSERT INTO services_gallery (_order, _parent_id, id, image_id) VALUES ($1,$2,$3,$4)`,
        [i + 1, id, genId(), gallery[i]],
      )
    }

    await client.query('COMMIT')
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: `A service with slug "${slug}" already exists.` }, { status: 409 })
    }
    console.error('Services API create failed', err)
    return NextResponse.json({ error: 'Could not create the service.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('service.create', { actor: auth.actor, targetType: 'service', targetId: id, summary: `${slug} (API)` })
  revalidateService(slug)

  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
  return NextResponse.json({ id, slug, url: base ? `${base}/${slug}/` : `/${slug}/` }, { status: 201 })
}
