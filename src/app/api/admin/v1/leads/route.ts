import { NextResponse } from 'next/server'

import { authorize } from '@/lib/api-auth'
import { toCsv } from '@/lib/csv'
import { getLeads } from '@/studio/leads'
import { LEAD_STATUSES, type LeadStatus } from '@/studio/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Read-only leads export for integrations/CRM sync.
 *   GET /api/leads?status=new&search=jane&format=json|csv
 * Returns up to 200 most-recent matching leads. Write operations are not exposed.
 */
export async function GET(req: Request) {
  const auth = await authorize(req, 'leads:read')
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const status =
    statusParam && LEAD_STATUSES.includes(statusParam as LeadStatus)
      ? (statusParam as LeadStatus)
      : undefined
  const search = url.searchParams.get('search') ?? undefined
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase()

  const leads = await getLeads(status, undefined, search)

  if (format === 'csv') {
    const header = [
      'id', 'created', 'status', 'name', 'phone', 'email', 'service', 'address',
      'message', 'source_page', 'form', 'estimated_value', 'next_follow_up',
      'email_sent', 'assignee', 'utm_source', 'utm_medium', 'utm_campaign',
    ]
    const csv = toCsv(
      header,
      leads.map((l) => [
        l.id, l.createdAt, l.status, l.name, l.phone, l.email, l.service, l.address,
        l.message, l.sourcePath, l.formLocation, l.estimatedValue, l.nextFollowUpAt,
        l.emailSent ? 'yes' : 'no', l.assigneeName, l.utm.source, l.utm.medium, l.utm.campaign,
      ]),
    )
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
      },
    })
  }

  return NextResponse.json({ count: leads.length, leads })
}
