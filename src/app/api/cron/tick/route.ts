import { NextResponse } from 'next/server'

import { requireCronSecret } from '@/lib/api-auth'
import { runFollowUpReminders, runScheduledPublishing } from '@/lib/cron-tasks'

export const dynamic = 'force-dynamic'

/** Periodic worker: publishes scheduled posts and sends follow-up reminders. */
export async function GET(request: Request) {
  const auth = requireCronSecret(request)
  if (!auth.ok) return auth.response

  const [publishing, reminders] = await Promise.all([
    runScheduledPublishing(),
    runFollowUpReminders(),
  ])
  return NextResponse.json({ ...publishing, ...reminders })
}
