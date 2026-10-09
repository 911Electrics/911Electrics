'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

import { query } from '@/db/client'
import {
  disconnectGoogle,
  fetchAllReviews,
  getIntegration,
  markSync,
  postReviewReply,
  saveLocationChoice,
  starToInt,
} from '@/lib/google'
import { logAudit } from '@/studio/audit'
import { can, getStudioUser } from '@/studio/auth'

export type GoogleActionResult = { ok: true; message?: string } | { ok: false; error: string }

async function requireReviews() {
  const me = await getStudioUser()
  if (!me || !can(me, 'reviews')) throw new Error('Not allowed')
  return me
}

async function requireAdmin() {
  const me = await getStudioUser()
  if (!me || me.role !== 'admin') throw new Error('Admins only')
  return me
}

/** Pull every review from Google and upsert into google_reviews. */
export async function syncGoogleReviews(): Promise<GoogleActionResult> {
  await requireReviews()
  const integration = await getIntegration()
  if (!integration.connected) return { ok: false, error: 'Google is not connected.' }
  if (!integration.locationName) return { ok: false, error: 'Choose a business location first.' }

  try {
    const reviews = await fetchAllReviews(integration.locationName)
    for (const r of reviews) {
      await query(
        `INSERT INTO google_reviews
           (google_name, reviewer_name, reviewer_photo, star_rating, comment, create_time,
            update_time, reply_comment, reply_update_time, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
         ON CONFLICT (google_name) DO UPDATE SET
           reviewer_name = EXCLUDED.reviewer_name,
           reviewer_photo = EXCLUDED.reviewer_photo,
           star_rating = EXCLUDED.star_rating,
           comment = EXCLUDED.comment,
           update_time = EXCLUDED.update_time,
           reply_comment = EXCLUDED.reply_comment,
           reply_update_time = EXCLUDED.reply_update_time,
           synced_at = now()`,
        [
          r.name,
          r.reviewer?.displayName ?? null,
          r.reviewer?.profilePhotoUrl ?? null,
          starToInt(r.starRating),
          r.comment ?? null,
          r.createTime ?? null,
          r.updateTime ?? null,
          r.reviewReply?.comment ?? null,
          r.reviewReply?.updateTime ?? null,
        ],
      )
    }
    await markSync(null)
    await logAudit('google.sync', { summary: `Synced ${reviews.length} Google reviews` })
    revalidatePath('/studio/testimonials/google')
    return { ok: true, message: `Synced ${reviews.length} review${reviews.length === 1 ? '' : 's'}.` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    await markSync(msg).catch(() => {})
    return { ok: false, error: msg }
  }
}

/** Post (or update) the public reply to a Google review. */
export async function replyToGoogleReview(
  id: number,
  _prev: GoogleActionResult,
  formData: FormData,
): Promise<GoogleActionResult> {
  await requireReviews()
  const comment = String(formData.get('reply') ?? '').trim()
  if (!comment) return { ok: false, error: 'Write a reply first.' }

  const [row] = await query<{ google_name: string }>(
    `SELECT google_name FROM google_reviews WHERE id = $1`,
    [id],
  )
  if (!row) return { ok: false, error: 'Review not found.' }

  try {
    await postReviewReply(row.google_name, comment)
    await query(
      `UPDATE google_reviews SET reply_comment = $2, reply_update_time = now() WHERE id = $1`,
      [id, comment],
    )
    await logAudit('google.reply', { targetType: 'google_review', targetId: id, summary: 'Replied to a Google review' })
    revalidatePath('/studio/testimonials/google')
    return { ok: true, message: 'Reply posted to Google.' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reply failed' }
  }
}

/** Promote a Google review to a featured on-site testimonial (or remove it). */
export async function toggleFeatureGoogleReview(id: number): Promise<GoogleActionResult> {
  await requireReviews()
  const [r] = await query<{
    google_name: string
    reviewer_name: string | null
    star_rating: number | null
    comment: string | null
    create_time: string | null
    featured: boolean
    testimonial_id: number | null
  }>(
    `SELECT google_name, reviewer_name, star_rating, comment, create_time, featured, testimonial_id
     FROM google_reviews WHERE id = $1`,
    [id],
  )
  if (!r) return { ok: false, error: 'Review not found.' }

  try {
    if (r.featured && r.testimonial_id) {
      await query(`DELETE FROM testimonials WHERE id = $1`, [r.testimonial_id])
      await query(`UPDATE google_reviews SET featured = false, testimonial_id = NULL WHERE id = $1`, [id])
    } else {
      if (!r.comment) return { ok: false, error: 'This review has no text to feature.' }
      // Avoid duplicates if this review was featured before.
      await query(`DELETE FROM testimonials WHERE external_id = $1`, [r.google_name])
      const [t] = await query<{ id: number }>(
        `INSERT INTO testimonials (author_name, rating, text, source, date, featured, external_id, updated_at, created_at)
         VALUES ($1, $2, $3, 'google', $4, true, $5, now(), now())
         RETURNING id`,
        [r.reviewer_name ?? 'Google reviewer', r.star_rating ?? 5, r.comment, r.create_time, r.google_name],
      )
      await query(`UPDATE google_reviews SET featured = true, testimonial_id = $2 WHERE id = $1`, [id, t.id])
    }
    revalidateTag('testimonials', 'max')
    revalidatePath('/')
    revalidatePath('/studio/testimonials/google')
    revalidatePath('/studio/testimonials')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not update' }
  }
}

export async function selectGoogleLocation(
  accountName: string,
  locationName: string,
  locationTitle: string,
): Promise<void> {
  await requireAdmin()
  await saveLocationChoice(accountName, locationName, locationTitle)
  await logAudit('google.location', { summary: `Selected Google location: ${locationTitle}` })
  revalidatePath('/studio/settings/google')
  revalidatePath('/studio/testimonials/google')
}

export async function disconnectGoogleAction(): Promise<void> {
  await requireAdmin()
  await disconnectGoogle()
  await logAudit('google.disconnect', { summary: 'Disconnected Google Business Profile' })
  revalidatePath('/studio/settings/google')
}
