import { NextResponse } from 'next/server'

import { toCsv } from '@/lib/csv'
import { LEAD_STATUSES, type LeadStatus } from '@/studio/constants'
import { can, getStudioUser } from '@/studio/auth'
import { getLeads } from '@/studio/leads'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getStudioUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  if (!can(user, 'leads')) return new NextResponse('Forbidden', { status: 403 })

  const status = new URL(request.url).searchParams.get('status')
  const filter = status && LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined
  const leads = await getLeads(filter)

  const header = [
    'id', 'created', 'status', 'owner', 'name', 'phone', 'email', 'service', 'address', 'message',
    'source_page', 'form', 'estimated_value', 'next_follow_up', 'email_sent',
    'utm_source', 'utm_medium', 'utm_campaign',
  ]
  const csv = toCsv(
    header,
    leads.map((l) => [
      l.id, l.createdAt, l.status, l.assigneeName, l.name, l.phone, l.email, l.service, l.address, l.message,
      l.sourcePath, l.formLocation, l.estimatedValue, l.nextFollowUpAt, l.emailSent ? 'yes' : 'no',
      l.utm.source, l.utm.medium, l.utm.campaign,
    ]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
