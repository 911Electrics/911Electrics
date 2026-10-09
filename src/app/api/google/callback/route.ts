import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { exchangeCode, getUserEmail, saveConnection } from '@/lib/google'
import { logAudit } from '@/studio/audit'
import { getStudioUser } from '@/studio/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const settingsUrl = (params: Record<string, string>) => {
    const u = new URL('/studio/settings/google', request.url)
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
    return u
  }

  const me = await getStudioUser()
  if (!me || me.role !== 'admin') {
    return NextResponse.redirect(new URL('/studio', request.url))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const jar = await cookies()
  const savedState = jar.get('google_oauth_state')?.value
  jar.delete('google_oauth_state')

  if (oauthError) return NextResponse.redirect(settingsUrl({ error: oauthError }))
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(settingsUrl({ error: 'state' }))
  }

  try {
    const { accessToken, refreshToken } = await exchangeCode(code)
    if (!refreshToken) {
      // Google only returns a refresh token on first consent; prompt=consent
      // should force one. If it's missing, ask them to retry.
      return NextResponse.redirect(settingsUrl({ error: 'norefresh' }))
    }
    const email = await getUserEmail(accessToken)
    await saveConnection({ refreshToken, email })
    await logAudit('google.connect', { summary: `Connected Google Business Profile${email ? ` (${email})` : ''}` })
    return NextResponse.redirect(settingsUrl({ connected: '1' }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.redirect(settingsUrl({ error: msg.slice(0, 120) }))
  }
}
