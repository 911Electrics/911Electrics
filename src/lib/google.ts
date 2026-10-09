import 'server-only'

import { query } from '@/db/client'

import { decryptSecret, encryptSecret } from './secret-box'

/**
 * Google Business Profile integration — OAuth + the v1 account/location and v4
 * reviews APIs. Everything is gated on GOOGLE_CLIENT_ID/SECRET and a stored
 * connection; nothing runs until the owner connects their Google account.
 *
 * Required env:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  – OAuth client (Web application)
 *   NEXT_PUBLIC_SERVER_URL                  – used to build the redirect URI
 */

const SCOPES = ['https://www.googleapis.com/auth/business.manage', 'openid', 'email']

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function redirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
  return `${base}/api/google/callback`
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  error?: string
  error_description?: string
}

export async function exchangeCode(
  code: string,
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  const data = (await res.json()) as TokenResponse
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange failed')
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null }
}

async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await res.json()) as TokenResponse
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token refresh failed')
  }
  return data.access_token
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { email?: string }
    return data.email ?? null
  } catch {
    return null
  }
}

// --- Integration row (singleton id = 1) ---

export type GoogleIntegration = {
  connected: boolean
  accountName: string | null
  locationName: string | null
  locationTitle: string | null
  connectedEmail: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
  lastSyncError: string | null
}

type IntegrationRow = {
  refresh_token: string | null
  account_name: string | null
  location_name: string | null
  location_title: string | null
  connected_email: string | null
  connected_at: string | null
  last_synced_at: string | null
  last_sync_error: string | null
}

export async function getIntegration(): Promise<GoogleIntegration> {
  const [r] = await query<IntegrationRow>(
    `SELECT refresh_token, account_name, location_name, location_title, connected_email,
            connected_at, last_synced_at, last_sync_error
     FROM google_integration WHERE id = 1`,
  )
  return {
    connected: Boolean(r?.refresh_token),
    accountName: r?.account_name ?? null,
    locationName: r?.location_name ?? null,
    locationTitle: r?.location_title ?? null,
    connectedEmail: r?.connected_email ?? null,
    connectedAt: r?.connected_at ?? null,
    lastSyncedAt: r?.last_synced_at ?? null,
    lastSyncError: r?.last_sync_error ?? null,
  }
}

export async function saveConnection(input: {
  refreshToken: string
  email: string | null
}): Promise<void> {
  await query(
    `INSERT INTO google_integration (id, refresh_token, connected_email, connected_at, updated_at)
     VALUES (1, $1, $2, now(), now())
     ON CONFLICT (id) DO UPDATE
       SET refresh_token = EXCLUDED.refresh_token,
           connected_email = EXCLUDED.connected_email,
           connected_at = now(),
           updated_at = now()`,
    [encryptSecret(input.refreshToken), input.email],
  )
}

export async function saveLocationChoice(
  accountName: string,
  locationName: string,
  locationTitle: string,
): Promise<void> {
  await query(
    `UPDATE google_integration
       SET account_name = $1, location_name = $2, location_title = $3, updated_at = now()
     WHERE id = 1`,
    [accountName, locationName, locationTitle],
  )
}

export async function disconnectGoogle(): Promise<void> {
  await query(
    `UPDATE google_integration
       SET refresh_token = NULL, account_name = NULL, location_name = NULL,
           location_title = NULL, connected_email = NULL, connected_at = NULL,
           last_synced_at = NULL, last_sync_error = NULL, updated_at = now()
     WHERE id = 1`,
  )
}

async function storedAccessToken(): Promise<string> {
  const [r] = await query<{ refresh_token: string | null }>(
    `SELECT refresh_token FROM google_integration WHERE id = 1`,
  )
  if (!r?.refresh_token) throw new Error('Google is not connected')
  const refresh = decryptSecret(r.refresh_token)
  if (!refresh) throw new Error('Stored Google token is unreadable — reconnect')
  return accessTokenFromRefresh(refresh)
}

// --- Business Profile API ---

export type GoogleLocation = { name: string; accountName: string; title: string }

/** List every location across all accounts the connected user manages. */
export async function listLocations(): Promise<GoogleLocation[]> {
  const token = await storedAccessToken()
  const out: GoogleLocation[] = []

  const accRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20',
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!accRes.ok) throw new Error(`Could not list Google accounts (${accRes.status})`)
  const accounts = ((await accRes.json()) as { accounts?: { name: string }[] }).accounts ?? []

  for (const acc of accounts) {
    let pageToken: string | undefined
    do {
      const url = new URL(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations`,
      )
      url.searchParams.set('readMask', 'name,title')
      url.searchParams.set('pageSize', '100')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) break
      const data = (await res.json()) as {
        locations?: { name: string; title: string }[]
        nextPageToken?: string
      }
      for (const loc of data.locations ?? []) {
        // v4 reviews want "accounts/x/locations/y" — combine account + location id.
        out.push({ name: `${acc.name}/${loc.name}`, accountName: acc.name, title: loc.title })
      }
      pageToken = data.nextPageToken
    } while (pageToken)
  }
  return out
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

export type GoogleReviewApi = {
  name: string
  reviewer?: { displayName?: string; profilePhotoUrl?: string }
  starRating?: string
  comment?: string
  createTime?: string
  updateTime?: string
  reviewReply?: { comment?: string; updateTime?: string }
}

/** Fetch every review for the selected location (paginated). */
export async function fetchAllReviews(locationName: string): Promise<GoogleReviewApi[]> {
  const token = await storedAccessToken()
  const reviews: GoogleReviewApi[] = []
  let pageToken: string | undefined
  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`)
    url.searchParams.set('pageSize', '50')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Reviews request failed (${res.status}): ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as { reviews?: GoogleReviewApi[]; nextPageToken?: string }
    reviews.push(...(data.reviews ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return reviews
}

export function starToInt(star?: string): number | null {
  return star ? (STAR_MAP[star] ?? null) : null
}

/** Post or update the business reply to a review. */
export async function postReviewReply(reviewName: string, comment: string): Promise<void> {
  const token = await storedAccessToken()
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Reply failed (${res.status}): ${body.slice(0, 200)}`)
  }
}

export async function markSync(error: string | null): Promise<void> {
  await query(
    `UPDATE google_integration SET last_synced_at = now(), last_sync_error = $1, updated_at = now() WHERE id = 1`,
    [error],
  )
}
