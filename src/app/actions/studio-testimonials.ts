'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { query } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { requireActionPermission } from '@/studio/auth'
import { TESTIMONIAL_SOURCES, type TestimonialSource } from '@/studio/constants'

export type TestimonialFormState = { error?: string }

type ParsedTestimonial = {
  authorName: string
  location: string | null
  rating: number
  text: string
  source: TestimonialSource | null
  date: string | null
  featured: boolean
}

function parse(form: FormData): ParsedTestimonial {
  const authorName = String(form.get('authorName') ?? '').trim()
  const text = String(form.get('text') ?? '').trim()
  if (!authorName) throw new Error('Reviewer name is required.')
  if (!text) throw new Error('Review text is required.')

  const location = String(form.get('location') ?? '').trim() || null

  const ratingNum = Number(form.get('rating'))
  const rating = Number.isFinite(ratingNum) ? Math.min(5, Math.max(1, Math.round(ratingNum))) : 5

  const sourceRaw = String(form.get('source') ?? '')
  const source = (TESTIMONIAL_SOURCES as readonly string[]).includes(sourceRaw)
    ? (sourceRaw as TestimonialSource)
    : null

  const dateRaw = String(form.get('date') ?? '').trim()
  let date: string | null = null
  if (dateRaw) {
    const d = new Date(dateRaw)
    if (!Number.isNaN(d.getTime())) date = d.toISOString()
  }

  const featured = form.get('featured') === 'on' || form.get('featured') === 'true'

  return { authorName, location, rating, text, source, date, featured }
}

/** Bust the public review caches + the Studio list. */
function revalidateAll(): void {
  revalidateTag('testimonials', 'max')
  revalidatePath('/studio/testimonials')
  revalidatePath('/')
}

export async function createTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  await requireActionPermission('reviews')
  let data: ParsedTestimonial
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save review.' }
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO testimonials
       (author_name, location, rating, text, source, date, featured, updated_at, created_at)
     VALUES ($1, $2, $3, $4, $5::enum_testimonials_source, $6, $7, now(), now())
     RETURNING id`,
    [data.authorName, data.location, data.rating, data.text, data.source, data.date, data.featured],
  )
  await logAudit('review.create', { targetType: 'review', targetId: rows[0]?.id, summary: data.authorName })
  revalidateAll()
  redirect('/studio/testimonials')
}

export async function updateTestimonial(
  id: number,
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  await requireActionPermission('reviews')
  let data: ParsedTestimonial
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save review.' }
  }
  await query(
    `UPDATE testimonials SET
       author_name = $2, location = $3, rating = $4, text = $5,
       source = $6::enum_testimonials_source, date = $7, featured = $8, updated_at = now()
     WHERE id = $1`,
    [id, data.authorName, data.location, data.rating, data.text, data.source, data.date, data.featured],
  )
  await logAudit('review.update', { targetType: 'review', targetId: id, summary: data.authorName })
  revalidateAll()
  redirect('/studio/testimonials')
}

export async function deleteTestimonial(id: number): Promise<void> {
  await requireActionPermission('reviews')
  await query(`DELETE FROM testimonials WHERE id = $1`, [id])
  await logAudit('review.delete', { targetType: 'review', targetId: id })
  revalidateAll()
}

export async function setTestimonialFeatured(id: number, featured: boolean): Promise<void> {
  await requireActionPermission('reviews')
  await query(`UPDATE testimonials SET featured = $2, updated_at = now() WHERE id = $1`, [
    id,
    featured,
  ])
  await logAudit('review.feature', {
    targetType: 'review',
    targetId: id,
    summary: featured ? 'Featured' : 'Unfeatured',
  })
  revalidateAll()
}
