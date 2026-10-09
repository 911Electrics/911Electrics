'use server'

import crypto from 'crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { pool } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { requireActionPermission } from '@/studio/auth'

export type ServiceFormState = { error?: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const genId = (): string => crypto.randomBytes(12).toString('hex')

type TextItem = { title: string; text: string }
type Faq = { question: string; answer: string }

type ParsedService = {
  title: string
  navLabel: string
  slug: string
  heroSubheading: string | null
  shortDescription: string | null
  intro: string
  cardImageId: number | null
  heroImageId: number | null
  metaImageId: number | null
  metaTitle: string | null
  metaDescription: string | null
  displayOrder: number | null
  showRatingBadge: boolean
  status: 'draft' | 'published'
  benefits: TextItem[]
  features: TextItem[]
  faqs: Faq[]
  galleryImageIds: number[]
}

function idOrNull(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function jsonOrThrow(raw: string, label: string): string {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('root' in parsed)) throw new Error()
    return JSON.stringify(parsed)
  } catch {
    throw new Error(`The ${label} content could not be read.`)
  }
}

function parseTextItems(form: FormData, key: string): TextItem[] {
  try {
    const arr = JSON.parse(String(form.get(key) ?? '[]'))
    if (!Array.isArray(arr)) return []
    return arr
      .map((i) => ({ title: String(i?.title ?? '').trim(), text: String(i?.text ?? '').trim() }))
      .filter((i) => i.title || i.text)
  } catch {
    return []
  }
}

function parseFaqs(form: FormData): Faq[] {
  let keys: string[]
  try {
    keys = JSON.parse(String(form.get('faqKeys') ?? '[]'))
    if (!Array.isArray(keys)) return []
  } catch {
    return []
  }
  const out: Faq[] = []
  for (const key of keys) {
    const question = String(form.get(`faqQuestion__${key}`) ?? '').trim()
    const answerRaw = String(form.get(`faqAnswer__${key}`) ?? '')
    if (!question) continue
    out.push({ question, answer: jsonOrThrow(answerRaw, 'FAQ answer') })
  }
  return out
}

function parse(form: FormData): ParsedService {
  const title = String(form.get('title') ?? '').trim()
  if (!title) throw new Error('Title is required.')
  const navLabel = String(form.get('navLabel') ?? '').trim() || title
  const slug = slugify(String(form.get('slug') ?? '').trim() || title)
  if (!slug) throw new Error('Could not derive a URL slug — please set one.')

  const displayRaw = String(form.get('displayOrder') ?? '').trim()
  const displayOrder = displayRaw ? Number(displayRaw) : null
  if (displayOrder !== null && !Number.isFinite(displayOrder))
    throw new Error('Display order must be a number.')

  return {
    title,
    navLabel,
    slug,
    heroSubheading: String(form.get('heroSubheading') ?? '').trim() || null,
    shortDescription: String(form.get('shortDescription') ?? '').trim() || null,
    intro: jsonOrThrow(String(form.get('intro') ?? ''), 'intro'),
    cardImageId: idOrNull(form, 'cardImage'),
    heroImageId: idOrNull(form, 'heroImage'),
    metaImageId: idOrNull(form, 'metaImage'),
    metaTitle: String(form.get('metaTitle') ?? '').trim() || null,
    metaDescription: String(form.get('metaDescription') ?? '').trim() || null,
    displayOrder,
    showRatingBadge: form.get('showRatingBadge') === 'on',
    status: form.get('status') === 'published' ? 'published' : 'draft',
    benefits: parseTextItems(form, 'benefits'),
    features: parseTextItems(form, 'features'),
    faqs: parseFaqs(form),
    galleryImageIds: (() => {
      try {
        const arr = JSON.parse(String(form.get('gallery') ?? '[]'))
        return Array.isArray(arr) ? arr.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : []
      } catch {
        return []
      }
    })(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeChildren(client: any, id: number, data: ParsedService): Promise<void> {
  await client.query(`DELETE FROM services_benefits WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.benefits.length; i++) {
    await client.query(
      `INSERT INTO services_benefits (_order, _parent_id, id, title, text) VALUES ($1,$2,$3,$4,$5)`,
      [i + 1, id, genId(), data.benefits[i].title, data.benefits[i].text],
    )
  }
  await client.query(`DELETE FROM services_features WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.features.length; i++) {
    await client.query(
      `INSERT INTO services_features (_order, _parent_id, id, title, text) VALUES ($1,$2,$3,$4,$5)`,
      [i + 1, id, genId(), data.features[i].title, data.features[i].text],
    )
  }
  await client.query(`DELETE FROM services_faqs WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.faqs.length; i++) {
    await client.query(
      `INSERT INTO services_faqs (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [i + 1, id, genId(), data.faqs[i].question, data.faqs[i].answer],
    )
  }
  await client.query(`DELETE FROM services_gallery WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.galleryImageIds.length; i++) {
    await client.query(
      `INSERT INTO services_gallery (_order, _parent_id, id, image_id) VALUES ($1,$2,$3,$4)`,
      [i + 1, id, genId(), data.galleryImageIds[i]],
    )
  }
}

function revalidateService(slug: string): void {
  revalidateTag('services', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/services')
  revalidatePath('/service-areas')
  revalidatePath(`/${slug}`)
  revalidatePath('/')
  revalidatePath('/studio/services')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): string {
  if (err?.code === '23505') return 'A service with that URL slug already exists. Choose a different slug.'
  return err instanceof Error ? err.message : 'Could not save the service.'
}

export async function createService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireActionPermission('content')

  let data: ParsedService
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the service.' }
  }

  let newId = 0
  const client = await pool.connect()
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
        data.title,
        data.navLabel,
        data.slug,
        data.heroSubheading,
        data.shortDescription,
        data.intro,
        data.cardImageId,
        data.heroImageId,
        data.metaImageId,
        data.metaTitle,
        data.metaDescription,
        data.displayOrder,
        data.showRatingBadge,
        data.status,
      ],
    )
    newId = rows[0].id
    await writeChildren(client, newId, data)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: dbError(err) }
  } finally {
    client.release()
  }

  await logAudit('service.create', { targetType: 'service', targetId: newId, summary: data.slug })
  revalidateService(data.slug)
  redirect('/studio/services')
}

export async function updateService(
  id: number,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireActionPermission('content')

  let data: ParsedService
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the service.' }
  }

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
        data.title,
        data.navLabel,
        data.slug,
        data.heroSubheading,
        data.shortDescription,
        data.intro,
        data.cardImageId,
        data.heroImageId,
        data.metaImageId,
        data.metaTitle,
        data.metaDescription,
        data.displayOrder,
        data.showRatingBadge,
        data.status,
      ],
    )
    await writeChildren(client, id, data)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: dbError(err) }
  } finally {
    client.release()
  }

  await logAudit('service.update', { targetType: 'service', targetId: id, summary: data.slug })
  revalidateService(data.slug)
  redirect('/studio/services')
}

export async function deleteService(id: number, slug: string): Promise<void> {
  await requireActionPermission('content')

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
    throw err
  } finally {
    client.release()
  }

  await logAudit('service.delete', { targetType: 'service', targetId: id, summary: slug })
  revalidateService(slug)
}
