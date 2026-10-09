import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authorize } from '@/lib/api-auth'
import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { TESTIMONIAL_SOURCES } from '@/studio/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function revalidateAll(): void {
  revalidateTag('testimonials', 'max')
  revalidatePath('/studio/testimonials')
  revalidatePath('/')
}

const patchSchema = z
  .object({
    authorName: z.string().trim().min(1).max(200).optional(),
    text: z.string().trim().min(1).max(4000).optional(),
    location: z.string().trim().max(200).nullable().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    source: z.enum(TESTIMONIAL_SOURCES).nullable().optional(),
    date: z.string().datetime().nullable().optional(),
    featured: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update.' })

type Row = {
  id: number
  author_name: string | null
  location: string | null
  rating: number | null
  text: string | null
  source: string | null
  date: string | null
  featured: boolean | null
}

async function load(id: number): Promise<Row | null> {
  const rows = await query<Row>(
    `SELECT id, author_name, location, rating, text, source, date, featured
     FROM testimonials WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function GET(req: Request, { params }: Params) {
  const auth = await authorize(req, 'testimonials:read')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const r = await load(id)
  if (!r) return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 })
  return NextResponse.json({
    id: r.id,
    authorName: r.author_name,
    location: r.location,
    rating: r.rating,
    text: r.text,
    source: r.source,
    date: r.date,
    featured: r.featured,
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authorize(req, 'testimonials:write')
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

  const existing = await load(id)
  if (!existing) return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 })

  const authorName = d.authorName ?? existing.author_name ?? ''
  const text = d.text ?? existing.text ?? ''
  const location = d.location !== undefined ? d.location : existing.location
  const rating = d.rating ?? existing.rating ?? 5
  const source = d.source !== undefined ? d.source : existing.source
  const date = d.date !== undefined ? d.date : existing.date
  const featured = d.featured ?? existing.featured ?? false

  await query(
    `UPDATE testimonials SET
       author_name=$2, location=$3, rating=$4, text=$5,
       source=$6::enum_testimonials_source, date=$7, featured=$8, updated_at=now()
     WHERE id=$1`,
    [id, authorName, location, rating, text, source, date, featured],
  )
  await logAudit('review.update', { actor: auth.actor, targetType: 'review', targetId: id, summary: `${authorName} (API)` })
  revalidateAll()
  return NextResponse.json({ id, authorName, featured })
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await authorize(req, 'testimonials:write')
  if (!auth.ok) return auth.response
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const existing = await load(id)
  if (!existing) return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 })

  await query(`DELETE FROM testimonials WHERE id = $1`, [id])
  await logAudit('review.delete', { actor: auth.actor, targetType: 'review', targetId: id, summary: existing.author_name ?? String(id) })
  revalidateAll()
  return NextResponse.json({ id, deleted: true })
}
