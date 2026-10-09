'use server'

import { revalidatePath } from 'next/cache'

import { logAudit } from '@/studio/audit'
import { getCurrentSessionId, getStudioUser } from '@/studio/auth'
import { revokeOtherSessions, revokeSession } from '@/studio/sessions'

export async function revokeMySession(sid: string): Promise<void> {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')
  const current = await getCurrentSessionId()
  if (sid === current) return // use Sign out for the current device
  await revokeSession(me.id, sid)
  await logAudit('session.revoke', { summary: 'Signed out a device' })
  revalidatePath('/studio/account')
}

export async function revokeMyOtherSessions(): Promise<void> {
  const me = await getStudioUser()
  if (!me) throw new Error('Not authenticated')
  const current = await getCurrentSessionId()
  await revokeOtherSessions(me.id, current)
  await logAudit('session.revoke_others', { summary: 'Signed out all other devices' })
  revalidatePath('/studio/account')
}
