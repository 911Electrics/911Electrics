import { NextResponse } from 'next/server'

import { requireCronSecret } from '@/lib/api-auth'
import { runFollowUpReminders } from '@/lib/cron-tasks'

export const dynamic = 'force-dynamic'

/** Back-compat endpoint; the scheduled worker is /api/cron/tick. */
export async function GET(request: Request) {
  const auth = requireCronSecret(request)
  if (!auth.ok) return auth.response
  const reminders = await runFollowUpReminders()
  return NextResponse.json(reminders)
}
