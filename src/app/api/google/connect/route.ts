import crypto from 'crypto'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAuthUrl, googleConfigured } from '@/lib/google'
import { getStudioUser } from '@/studio/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const me = await getStudioUser()
  if (!me || me.role !== 'admin') {
    return NextResponse.redirect(new URL('/studio', request.url))
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/studio/settings/google?error=notconfigured', request.url))
  }

  const state = crypto.randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return NextResponse.redirect(getAuthUrl(state))
}
