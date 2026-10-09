'use server'

import { redirect } from 'next/navigation'

import { completeTotpLogin, studioLogin, studioLogout } from '@/studio/auth'

export type StudioLoginState = { error?: string; needsTotp?: boolean }

export async function loginAction(
  _prev: StudioLoginState,
  formData: FormData,
): Promise<StudioLoginState> {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const result = await studioLogin(email, password)
  if (result.ok) {
    redirect('/studio')
  }
  if ('needsTotp' in result && result.needsTotp) {
    return { needsTotp: true }
  }
  return { error: 'error' in result ? result.error : 'Invalid email or password.' }
}

export async function verifyTotpAction(
  _prev: StudioLoginState,
  formData: FormData,
): Promise<StudioLoginState> {
  const code = String(formData.get('code') || '').trim()
  if (!code) return { needsTotp: true, error: 'Enter your authentication code.' }

  const result = await completeTotpLogin(code)
  if (result.ok) {
    redirect('/studio')
  }
  return { needsTotp: true, error: 'error' in result ? result.error : 'Invalid code.' }
}

export async function logoutAction(): Promise<void> {
  await studioLogout()
  redirect('/studio/login')
}
