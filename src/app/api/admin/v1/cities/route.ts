import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authorize } from '@/lib/api-auth'
import { genId, toLexicalJson, toLexicalJsonOrEmpty } from '@/lib/api-richtext'
import { slugify } from '@/lib/api-posts'
import { pool, query } from '@/db/client'
import { logAudit } from '@/studio/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const richText = z.union([z.string(), z.object({ root: z.unknown() }).passthrough()])
const faqSchema = z.object({ question: z.string().trim().min(1).max(500), answer: richText.optional() })

const createSchema = z.object({
  cityName: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional(),
  title: z.string().trim().max(200).optional(),
  heroHeadingOverride: z.string().trim().max(300).optional(),
  introOverride: richText.optional(),
  localNotes: richText.optional(),
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  metaImageId: z.number().int().positive().optional(),
  pathOverride: z.string().trim().max(300).optional(),
  slug: z.string().trim().max(200).optional(),
  status: z.enum(['draft', 'published']).optional(),
  neighborhoods: z.array(z.string().trim().min(1)).max(200).optional(),
  zipCodes: z.array(z.string().trim().min(1)).max(200).optional(),
  faqs: z.array(faqSchema).max(50).optional(),
})

function revalidateCity(slug: string, pathOverride: string | null): void {
  revalidateTag('cities', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/service-areas')
  revalidatePath(pathOverride || `/${slug}`)
  revalidatePath('/')
  revalidatePath('/studio/cities')
}

export async function GET(req: Request) {
  const auth = await authorize(req, 'cities:read')
  if (!auth.ok) return auth.response

  const rows = await query<{
    id: number
    city_name: string | null
    slug: string | null
    region: string | null
    status: string | null
    path_override: string | null
  }>(
    `SELECT id, city_name, slug, region, _status AS status, path_override
     FROM cities ORDER BY city_name ASC LIMIT 300`,
  )
  return NextResponse.json({
    count: rows.length,
    cities: rows.map((r) => ({
      id: r.id,
      cityName: r.city_name,
      slug: r.slug,
      region: r.region,
      status: r.status,
      pathOverride: r.path_override,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await authorize(req, 'cities:write')
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

  const slug = slugify(d.slug || d.cityName)
  if (!slug) return NextResponse.json({ error: 'Could not derive a URL slug.' }, { status: 422 })

  const client = await pool.connect()
  let id: number
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO cities
         (city_name, region, title, hero_heading_override, intro_override, local_notes,
          meta_title, meta_description, meta_image_id, path_override, slug, _status,
          generate_slug, updated_at, created_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12::enum_cities_status,false,now(),now())
       RETURNING id`,
      [
        d.cityName,
        d.region ?? null,
        d.title ?? null,
        d.heroHeadingOverride ?? null,
        toLexicalJson(d.introOverride),
        toLexicalJson(d.localNotes),
        d.metaTitle ?? null,
        d.metaDescription ?? null,
        d.metaImageId ?? null,
        d.pathOverride ?? null,
        slug,
        d.status ?? 'draft',
      ],
    )
    id = rows[0].id

    const neighborhoods = d.neighborhoods ?? []
    for (let i = 0; i < neighborhoods.length; i++) {
      await client.query(
        `INSERT INTO cities_neighborhoods (_order, _parent_id, id, name) VALUES ($1,$2,$3,$4)`,
        [i + 1, id, genId(), neighborhoods[i]],
      )
    }
    const zips = d.zipCodes ?? []
    for (let i = 0; i < zips.length; i++) {
      await client.query(
        `INSERT INTO cities_zip_codes (_order, _parent_id, id, zip) VALUES ($1,$2,$3,$4)`,
        [i + 1, id, genId(), zips[i]],
      )
    }
    const faqs = d.faqs ?? []
    for (let i = 0; i < faqs.length; i++) {
      await client.query(
        `INSERT INTO cities_faqs_override (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [i + 1, id, genId(), faqs[i].question, toLexicalJsonOrEmpty(faqs[i].answer)],
      )
    }

    await client.query('COMMIT')
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: `A service area with slug "${slug}" already exists.` }, { status: 409 })
    }
    console.error('Cities API create failed', err)
    return NextResponse.json({ error: 'Could not create the service area.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('city.create', { actor: auth.actor, targetType: 'city', targetId: id, summary: `${slug} (API)` })
  revalidateCity(slug, d.pathOverride ?? null)

  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
  const path = d.pathOverride || `/${slug}/`
  return NextResponse.json({ id, slug, url: base ? `${base}${path}` : path }, { status: 201 })
}
