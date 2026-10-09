import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authorize } from '@/lib/api-auth'
import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { TESTIMONIAL_SOURCES } from '@/studio/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createSchema = z.object({
  authorName: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(4000),
  location: z.string().trim().max(200).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  source: z.enum(TESTIMONIAL_SOURCES).optional(),
  date: z.string().datetime().optional(),
  featured: z.boolean().optional(),
})

function revalidateAll(): void {
  revalidateTag('testimonials', 'max')
  revalidatePath('/studio/testimonials')
  revalidatePath('/')
}

export async function GET(req: Request) {
  const auth = await authorize(req, 'testimonials:read')
  if (!auth.ok) return auth.response

  const rows = await query<{
    id: number
    author_name: string | null
    location: string | null
    rating: number | null
    text: string | null
    source: string | null
    date: string | null
    featured: boolean | null
    created_at: string
  }>(
    `SELECT id, author_name, location, rating, text, source, date, featured, created_at
     FROM testimonials ORDER BY created_at DESC, id DESC LIMIT 200`,
  )
  return NextResponse.json({
    count: rows.length,
    testimonials: rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      location: r.location,
      rating: r.rating,
      text: r.text,
      source: r.source,
      date: r.date,
      featured: r.featured,
      createdAt: r.created_at,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await authorize(req, 'testimonials:write')
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

  const rows = await query<{ id: number }>(
    `INSERT INTO testimonials
       (author_name, location, rating, text, source, date, featured, updated_at, created_at)
     VALUES ($1,$2,$3,$4,$5::enum_testimonials_source,$6,$7, now(), now())
     RETURNING id`,
    [
      d.authorName,
      d.location ?? null,
      d.rating ?? 5,
      d.text,
      d.source ?? null,
      d.date ?? null,
      d.featured ?? false,
    ],
  )
  const id = rows[0].id
  await logAudit('review.create', { actor: auth.actor, targetType: 'review', targetId: id, summary: `${d.authorName} (API)` })
  revalidateAll()
  return NextResponse.json({ id, authorName: d.authorName, featured: d.featured ?? false }, { status: 201 })
}
