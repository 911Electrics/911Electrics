import 'server-only'

import { query } from '@/db/client'

export type GoogleReviewRow = {
  id: number
  googleName: string
  reviewerName: string | null
  reviewerPhoto: string | null
  starRating: number | null
  comment: string | null
  createTime: string | null
  replyComment: string | null
  replyUpdateTime: string | null
  featured: boolean
  testimonialId: number | null
}

type Row = {
  id: number
  google_name: string
  reviewer_name: string | null
  reviewer_photo: string | null
  star_rating: number | null
  comment: string | null
  create_time: string | null
  reply_comment: string | null
  reply_update_time: string | null
  featured: boolean | null
  testimonial_id: number | null
}

const map = (r: Row): GoogleReviewRow => ({
  id: r.id,
  googleName: r.google_name,
  reviewerName: r.reviewer_name,
  reviewerPhoto: r.reviewer_photo,
  starRating: r.star_rating,
  comment: r.comment,
  createTime: r.create_time,
  replyComment: r.reply_comment,
  replyUpdateTime: r.reply_update_time,
  featured: Boolean(r.featured),
  testimonialId: r.testimonial_id,
})

export async function getGoogleReviews(): Promise<GoogleReviewRow[]> {
  const rows = await query<Row>(
    `SELECT id, google_name, reviewer_name, reviewer_photo, star_rating, comment, create_time,
            reply_comment, reply_update_time, featured, testimonial_id
     FROM google_reviews ORDER BY create_time DESC NULLS LAST, id DESC`,
  )
  return rows.map(map)
}

export type GoogleReviewStats = { count: number; average: number | null; replied: number }

export async function getGoogleReviewStats(): Promise<GoogleReviewStats> {
  const [r] = await query<{ count: string; avg: string | null; replied: string }>(
    `SELECT count(*)::text AS count,
            (avg(star_rating))::text AS avg,
            count(*) FILTER (WHERE reply_comment IS NOT NULL)::text AS replied
     FROM google_reviews`,
  )
  return {
    count: Number(r?.count ?? 0),
    average: r?.avg != null ? Number(r.avg) : null,
    replied: Number(r?.replied ?? 0),
  }
}
