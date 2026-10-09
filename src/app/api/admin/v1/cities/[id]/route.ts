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

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function revalidateCity(slug: string | null, pathOverride: string | null): void {
  revalidateTag('cities', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/service-areas')
  revalidatePath(pathOverride || `/${slug ?? ''}`)
  revalidatePath('/')
  revalidatePath('/studio/cities')
}

const richText = z.union([z.string(), z.object({ root: z.unknown() }).passthrough()])
const faqSchema = z.object({ question: z.string().trim().min(1).max(500), answer: richText.optional() })

const patchSchema = z
  .object({
    cityName: z.string().trim().min(1).max(120).optional(),
    region: z.string().trim().max(120).nullable().optional(),
    title: z.string().trim().max(200).nullable().optional(),
    heroHeadingOverride: z.string().trim().max(300).nullable().optional(),
    introOverride: richText.nullable().optional(),
    localNotes: richText.nullable().optional(),
    metaTitle: z.string().trim().max(160).nullable().optional(),
    metaDescription: z.string().trim().max(320).nullable().optional(),
    metaImageId: z.number().int().positive().nullable().optional(),
    pathOverride: z.string().trim().max(300).nullable().optional(),
    slug: z.string().trim().max(200).optional(),
    status: z.enum(['draft', 'published']).optional(),
    neighborhoods: z.array(z.string().trim().min(1)).max(200).optional(),
    zipCodes: z.array(z.string().trim().min(1)).max(200).optional(),
    faqs: z.array(faqSchema).max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

type CityRow = {
  id: number
  city_name: string | null
  region: string | null
  title: string | null
  hero_heading_override: string | null
  intro_override: string | null
  local_notes: string | null
  meta_title: string | null
  meta_description: string | null
  meta_image_id: number | null
  path_override: string | null
  slug: string | null
  status: string | null
}

async function loadCity(id: number): Promise<CityRow | null> {
  const rows = await query<CityRow>(
    `SELECT id, city_name, region, title, hero_heading_override,
            intro_override::text AS intro_override, local_notes::text AS local_notes,
            meta_title, meta_description, meta_image_id, path_override, slug, _status AS status
     FROM cities WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function GET(req: Request, { params }: Params) {
  const auth = await authorize(req, 'cities:read')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const city = await loadCity(id)
  if (!city) return NextResponse.json({ error: 'Service area not found.' }, { status: 404 })

  const [neighborhoods, zips, faqs] = await Promise.all([
    query<{ name: string | null }>(`SELECT name FROM cities_neighborhoods WHERE _parent_id = $1 ORDER BY _order`, [id]),
    query<{ zip: string | null }>(`SELECT zip FROM cities_zip_codes WHERE _parent_id = $1 ORDER BY _order`, [id]),
    query<{ question: string | null }>(`SELECT question FROM cities_faqs_override WHERE _parent_id = $1 ORDER BY _order`, [id]),
  ])
  return NextResponse.json({
    id: city.id,
    cityName: city.city_name,
    slug: city.slug,
    region: city.region,
    title: city.title,
    status: city.status,
    metaTitle: city.meta_title,
    metaDescription: city.meta_description,
    pathOverride: city.path_override,
    neighborhoods: neighborhoods.map((n) => n.name).filter(Boolean),
    zipCodes: zips.map((z) => z.zip).filter(Boolean),
    faqCount: faqs.length,
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authorize(req, 'cities:write')
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
  const existing = await loadCity(id)
  if (!existing) return NextResponse.json({ error: 'Service area not found.' }, { status: 404 })

  const m = <T>(v: T | undefined, fallback: T): T => (v !== undefined ? v : fallback)
  const cityName = d.cityName ?? existing.city_name ?? ''
  const slug = d.slug ? slugify(d.slug) : (existing.slug ?? slugify(cityName))
  const introOverride =
    d.introOverride !== undefined ? toLexicalJson(d.introOverride) : existing.intro_override
  const localNotes = d.localNotes !== undefined ? toLexicalJson(d.localNotes) : existing.local_notes

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE cities SET
         city_name=$2, region=$3, title=$4, hero_heading_override=$5,
         intro_override=$6::jsonb, local_notes=$7::jsonb,
         meta_title=$8, meta_description=$9, meta_image_id=$10, path_override=$11,
         slug=$12, _status=$13::enum_cities_status, updated_at=now()
       WHERE id=$1`,
      [
        id,
        cityName,
        m(d.region, existing.region),
        m(d.title, existing.title),
        m(d.heroHeadingOverride, existing.hero_heading_override),
        introOverride,
        localNotes,
        m(d.metaTitle, existing.meta_title),
        m(d.metaDescription, existing.meta_description),
        m(d.metaImageId, existing.meta_image_id),
        m(d.pathOverride, existing.path_override),
        slug,
        d.status ?? (existing.status === 'published' ? 'published' : 'draft'),
      ],
    )

    if (d.neighborhoods !== undefined) {
      await client.query(`DELETE FROM cities_neighborhoods WHERE _parent_id = $1`, [id])
      for (let i = 0; i < d.neighborhoods.length; i++) {
        await client.query(
          `INSERT INTO cities_neighborhoods (_order, _parent_id, id, name) VALUES ($1,$2,$3,$4)`,
          [i + 1, id, genId(), d.neighborhoods[i]],
        )
      }
    }
    if (d.zipCodes !== undefined) {
      await client.query(`DELETE FROM cities_zip_codes WHERE _parent_id = $1`, [id])
      for (let i = 0; i < d.zipCodes.length; i++) {
        await client.query(
          `INSERT INTO cities_zip_codes (_order, _parent_id, id, zip) VALUES ($1,$2,$3,$4)`,
          [i + 1, id, genId(), d.zipCodes[i]],
        )
      }
    }
    if (d.faqs !== undefined) {
      await client.query(`DELETE FROM cities_faqs_override WHERE _parent_id = $1`, [id])
      for (let i = 0; i < d.faqs.length; i++) {
        await client.query(
          `INSERT INTO cities_faqs_override (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [i + 1, id, genId(), d.faqs[i].question, toLexicalJsonOrEmpty(d.faqs[i].answer)],
        )
      }
    }

    await client.query('COMMIT')
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    if ((err as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: `Slug "${slug}" already exists.` }, { status: 409 })
    }
    console.error('Cities API update failed', err)
    return NextResponse.json({ error: 'Could not update the service area.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('city.update', { actor: auth.actor, targetType: 'city', targetId: id, summary: `${slug} (API)` })
  revalidateCity(existing.slug, existing.path_override)
  revalidateCity(slug, m(d.pathOverride, existing.path_override))
  return NextResponse.json({ id, slug })
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await authorize(req, 'cities:write')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const existing = await loadCity(id)
  if (!existing) return NextResponse.json({ error: 'Service area not found.' }, { status: 404 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const t of ['cities_neighborhoods', 'cities_zip_codes', 'cities_faqs_override']) {
      await client.query(`DELETE FROM ${t} WHERE _parent_id = $1`, [id])
    }
    await client.query(`DELETE FROM cities_rels WHERE parent_id = $1`, [id])
    await client.query(`DELETE FROM cities WHERE id = $1`, [id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Cities API delete failed', err)
    return NextResponse.json({ error: 'Could not delete the service area.' }, { status: 500 })
  } finally {
    client.release()
  }

  await logAudit('city.delete', { actor: auth.actor, targetType: 'city', targetId: id, summary: existing.slug ?? String(id) })
  revalidateCity(existing.slug, existing.path_override)
  return NextResponse.json({ id, deleted: true })
}
