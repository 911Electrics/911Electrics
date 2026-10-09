'use server'

import crypto from 'crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { pool } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { requireActionPermission } from '@/studio/auth'

export type CityFormState = { error?: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const genId = (): string => crypto.randomBytes(12).toString('hex')

/** Returns the rich-text JSON string, or null when the editor is effectively empty. */
function richTextOrNull(raw: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const root = (parsed as { root?: unknown })?.root
  if (!root) return null
  let hasText = false
  const walk = (n: unknown) => {
    const node = n as { text?: unknown; children?: unknown[] }
    if (typeof node?.text === 'string' && node.text.trim()) hasText = true
    if (Array.isArray(node?.children)) node.children.forEach(walk)
  }
  walk(root)
  return hasText ? JSON.stringify(parsed) : null
}

function jsonbOrThrow(raw: string, label: string): string {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('root' in parsed)) throw new Error()
    return JSON.stringify(parsed)
  } catch {
    throw new Error(`The ${label} could not be read.`)
  }
}

function parseStringList(form: FormData, key: string): string[] {
  try {
    const arr = JSON.parse(String(form.get(key) ?? '[]'))
    return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

type Faq = { question: string; answer: string }
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
    if (!question) continue
    out.push({ question, answer: jsonbOrThrow(String(form.get(`faqAnswer__${key}`) ?? ''), 'FAQ answer') })
  }
  return out
}

type ParsedCity = {
  cityName: string
  region: string | null
  title: string | null
  heroHeadingOverride: string | null
  introOverride: string | null
  localNotes: string | null
  metaTitle: string | null
  metaDescription: string | null
  metaImageId: number | null
  pathOverride: string | null
  slug: string
  status: 'draft' | 'published'
  neighborhoods: string[]
  zipCodes: string[]
  faqs: Faq[]
}

function idOrNull(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parse(form: FormData): ParsedCity {
  const cityName = String(form.get('cityName') ?? '').trim()
  if (!cityName) throw new Error('City name is required.')
  const slug = slugify(String(form.get('slug') ?? '').trim() || cityName)
  if (!slug) throw new Error('Could not derive a URL slug — please set one.')

  return {
    cityName,
    region: String(form.get('region') ?? '').trim() || null,
    title: String(form.get('title') ?? '').trim() || null,
    heroHeadingOverride: String(form.get('heroHeadingOverride') ?? '').trim() || null,
    introOverride: richTextOrNull(String(form.get('introOverride') ?? '')),
    localNotes: richTextOrNull(String(form.get('localNotes') ?? '')),
    metaTitle: String(form.get('metaTitle') ?? '').trim() || null,
    metaDescription: String(form.get('metaDescription') ?? '').trim() || null,
    metaImageId: idOrNull(form, 'metaImage'),
    pathOverride: String(form.get('pathOverride') ?? '').trim() || null,
    slug,
    status: form.get('status') === 'published' ? 'published' : 'draft',
    neighborhoods: parseStringList(form, 'neighborhoods'),
    zipCodes: parseStringList(form, 'zipCodes'),
    faqs: parseFaqs(form),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeChildren(client: any, id: number, data: ParsedCity): Promise<void> {
  await client.query(`DELETE FROM cities_neighborhoods WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.neighborhoods.length; i++) {
    await client.query(
      `INSERT INTO cities_neighborhoods (_order, _parent_id, id, name) VALUES ($1,$2,$3,$4)`,
      [i + 1, id, genId(), data.neighborhoods[i]],
    )
  }
  await client.query(`DELETE FROM cities_zip_codes WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.zipCodes.length; i++) {
    await client.query(
      `INSERT INTO cities_zip_codes (_order, _parent_id, id, zip) VALUES ($1,$2,$3,$4)`,
      [i + 1, id, genId(), data.zipCodes[i]],
    )
  }
  await client.query(`DELETE FROM cities_faqs_override WHERE _parent_id = $1`, [id])
  for (let i = 0; i < data.faqs.length; i++) {
    await client.query(
      `INSERT INTO cities_faqs_override (_order, _parent_id, id, question, answer) VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [i + 1, id, genId(), data.faqs[i].question, data.faqs[i].answer],
    )
  }
}

function revalidateCity(slug: string, pathOverride: string | null): void {
  revalidateTag('cities', 'max')
  revalidateTag('sitemap', 'max')
  revalidatePath('/service-areas')
  revalidatePath(pathOverride || `/${slug}`)
  revalidatePath('/')
  revalidatePath('/studio/cities')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): string {
  if (err?.code === '23505') return 'A service area with that URL slug already exists. Choose a different slug.'
  return err instanceof Error ? err.message : 'Could not save the service area.'
}

export async function createCity(_prev: CityFormState, formData: FormData): Promise<CityFormState> {
  await requireActionPermission('content')

  let data: ParsedCity
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the service area.' }
  }

  let newId = 0
  const client = await pool.connect()
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
        data.cityName,
        data.region,
        data.title,
        data.heroHeadingOverride,
        data.introOverride,
        data.localNotes,
        data.metaTitle,
        data.metaDescription,
        data.metaImageId,
        data.pathOverride,
        data.slug,
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

  await logAudit('city.create', { targetType: 'city', targetId: newId, summary: data.slug })
  revalidateCity(data.slug, data.pathOverride)
  redirect('/studio/cities')
}

export async function updateCity(
  id: number,
  _prev: CityFormState,
  formData: FormData,
): Promise<CityFormState> {
  await requireActionPermission('content')

  let data: ParsedCity
  try {
    data = parse(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the service area.' }
  }

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
        data.cityName,
        data.region,
        data.title,
        data.heroHeadingOverride,
        data.introOverride,
        data.localNotes,
        data.metaTitle,
        data.metaDescription,
        data.metaImageId,
        data.pathOverride,
        data.slug,
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

  await logAudit('city.update', { targetType: 'city', targetId: id, summary: data.slug })
  revalidateCity(data.slug, data.pathOverride)
  redirect('/studio/cities')
}

export async function deleteCity(id: number, slug: string, pathOverride: string | null): Promise<void> {
  await requireActionPermission('content')

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
    throw err
  } finally {
    client.release()
  }

  await logAudit('city.delete', { targetType: 'city', targetId: id, summary: slug })
  revalidateCity(slug, pathOverride)
}
