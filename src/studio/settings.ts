import 'server-only'

import { query } from '@/db/client'

import type { SocialPlatform } from './constants'

/** Site settings as edited in Studio (business info + social links). */
export type StudioSettings = {
  id: number
  businessName: string
  licenseNumber: string
  phone: string
  email: string
  addressStreet: string
  addressCity: string
  addressState: string
  addressZip: string
  geoLat: string
  geoLng: string
  hoursLabel: string
  ratingValue: string
  ratingCount: string
  socials: { platform: SocialPlatform; url: string }[]
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

export async function getStudioSettings(): Promise<StudioSettings> {
  const rows = await query<{
    id: number
    business_name: string | null
    license_number: string | null
    phone: string | null
    email: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    geo_lat: string | number | null
    geo_lng: string | number | null
    hours_label: string | null
    aggregate_rating_value: string | number | null
    aggregate_rating_count: string | number | null
  }>(
    `SELECT id, business_name, license_number, phone, email,
            address_street, address_city, address_state, address_zip,
            geo_lat, geo_lng, hours_label,
            aggregate_rating_value, aggregate_rating_count
     FROM site_settings ORDER BY id LIMIT 1`,
  )
  const s = rows[0]
  if (!s) throw new Error('site_settings row not found')

  const socials = await query<{ platform: SocialPlatform; url: string }>(
    `SELECT platform, url FROM site_settings_socials WHERE _parent_id = $1 ORDER BY _order`,
    [s.id],
  )

  return {
    id: s.id,
    businessName: str(s.business_name),
    licenseNumber: str(s.license_number),
    phone: str(s.phone),
    email: str(s.email),
    addressStreet: str(s.address_street),
    addressCity: str(s.address_city),
    addressState: str(s.address_state),
    addressZip: str(s.address_zip),
    geoLat: str(s.geo_lat),
    geoLng: str(s.geo_lng),
    hoursLabel: str(s.hours_label),
    ratingValue: str(s.aggregate_rating_value),
    ratingCount: str(s.aggregate_rating_count),
    socials: socials.map((r) => ({ platform: r.platform, url: r.url })),
  }
}
