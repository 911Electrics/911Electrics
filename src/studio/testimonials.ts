import 'server-only'

import { query } from '@/db/client'

import type { TestimonialSource } from './constants'

/** A testimonial as edited in Studio (all rows, not just featured). */
export type StudioTestimonial = {
  id: number
  authorName: string
  location: string | null
  rating: number
  text: string
  source: TestimonialSource | null
  date: string | null
  featured: boolean
}

type Row = {
  id: number
  author_name: string
  location: string | null
  rating: string | number
  text: string
  source: TestimonialSource | null
  date: string | null
  featured: boolean | null
}

const SELECT = `
  SELECT id, author_name, location, rating, text, source, date, featured
  FROM testimonials
`

function map(r: Row): StudioTestimonial {
  return {
    id: r.id,
    authorName: r.author_name,
    location: r.location,
    rating: Number(r.rating),
    text: r.text,
    source: r.source,
    date: r.date,
    featured: Boolean(r.featured),
  }
}

export async function getAllTestimonials(): Promise<StudioTestimonial[]> {
  const rows = await query<Row>(
    `${SELECT} ORDER BY featured DESC, date DESC NULLS LAST, created_at DESC`,
  )
  return rows.map(map)
}

export async function getTestimonialById(id: number): Promise<StudioTestimonial | null> {
  const rows = await query<Row>(`${SELECT} WHERE id = $1 LIMIT 1`, [id])
  return rows[0] ? map(rows[0]) : null
}
