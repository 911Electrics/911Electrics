'use server'

import crypto from 'crypto'

import { revalidatePath, revalidateTag } from 'next/cache'

import { pool } from '@/db/client'
import { logAudit } from '@/studio/audit'
import { requireActionAdmin } from '@/studio/auth'
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@/studio/constants'

export type SettingsFormState = { error?: string; ok?: boolean }

const text = (form: FormData, key: string): string => String(form.get(key) ?? '').trim()

/** Empty string -> null; otherwise the numeric value (or throws if invalid). */
function numOrNull(form: FormData, key: string, label: string): number | null {
  const raw = text(form, key)
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number.`)
  return n
}

function parseSocials(form: FormData): { platform: SocialPlatform; url: string }[] {
  const raw = String(form.get('socials') ?? '[]')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Could not read the social links.')
  }
  if (!Array.isArray(parsed)) return []
  const out: { platform: SocialPlatform; url: string }[] = []
  for (const item of parsed) {
    const platform = (item as { platform?: string })?.platform
    const url = String((item as { url?: string })?.url ?? '').trim()
    if (!url) continue
    if (!(SOCIAL_PLATFORMS as readonly string[]).includes(String(platform))) continue
    out.push({ platform: platform as SocialPlatform, url })
  }
  return out
}

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireActionAdmin()

  let fields: {
    businessName: string
    licenseNumber: string
    phone: string
    email: string
    addressStreet: string | null
    addressCity: string | null
    addressState: string | null
    addressZip: string | null
    geoLat: number | null
    geoLng: number | null
    hoursLabel: string | null
    ratingValue: number | null
    ratingCount: number | null
  }
  let socials: { platform: SocialPlatform; url: string }[]
  try {
    const businessName = text(formData, 'businessName')
    const phone = text(formData, 'phone')
    const email = text(formData, 'email')
    if (!businessName) throw new Error('Business name is required.')
    if (!phone) throw new Error('Phone is required.')
    if (!email) throw new Error('Email is required.')
    fields = {
      businessName,
      licenseNumber: text(formData, 'licenseNumber'),
      phone,
      email,
      addressStreet: text(formData, 'addressStreet') || null,
      addressCity: text(formData, 'addressCity') || null,
      addressState: text(formData, 'addressState') || null,
      addressZip: text(formData, 'addressZip') || null,
      geoLat: numOrNull(formData, 'geoLat', 'Latitude'),
      geoLng: numOrNull(formData, 'geoLng', 'Longitude'),
      hoursLabel: text(formData, 'hoursLabel') || null,
      ratingValue: numOrNull(formData, 'ratingValue', 'Rating value'),
      ratingCount: numOrNull(formData, 'ratingCount', 'Rating count'),
    }
    socials = parseSocials(formData)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save settings.' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ id: number }>(
      `SELECT id FROM site_settings ORDER BY id LIMIT 1`,
    )
    const id = rows[0]?.id
    if (!id) throw new Error('site_settings row not found')

    await client.query(
      `UPDATE site_settings SET
         business_name=$2, license_number=$3, phone=$4, email=$5,
         address_street=$6, address_city=$7, address_state=$8, address_zip=$9,
         geo_lat=$10, geo_lng=$11, hours_label=$12,
         aggregate_rating_value=$13, aggregate_rating_count=$14, updated_at=now()
       WHERE id=$1`,
      [
        id,
        fields.businessName,
        fields.licenseNumber,
        fields.phone,
        fields.email,
        fields.addressStreet,
        fields.addressCity,
        fields.addressState,
        fields.addressZip,
        fields.geoLat,
        fields.geoLng,
        fields.hoursLabel,
        fields.ratingValue,
        fields.ratingCount,
      ],
    )

    await client.query(`DELETE FROM site_settings_socials WHERE _parent_id=$1`, [id])
    for (let i = 0; i < socials.length; i++) {
      await client.query(
        `INSERT INTO site_settings_socials (_order, _parent_id, id, platform, url)
         VALUES ($1, $2, $3, $4::enum_site_settings_socials_platform, $5)`,
        [i + 1, id, crypto.randomBytes(12).toString('hex'), socials[i].platform, socials[i].url],
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { error: err instanceof Error ? err.message : 'Could not save settings.' }
  } finally {
    client.release()
  }

  await logAudit('settings.update', { summary: 'Updated business info' })
  revalidateTag('global_siteSettings', 'max')
  revalidatePath('/studio/settings')
  revalidatePath('/')
  return { ok: true }
}
