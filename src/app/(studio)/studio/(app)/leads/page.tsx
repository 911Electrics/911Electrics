import Link from 'next/link'

import {
  LEAD_STATUS_BADGE,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  timeAgo,
  type LeadStatus,
} from '@/studio/constants'
import { getStudioUser } from '@/studio/auth'
import { getLeads, getLeadStatusCounts } from '@/studio/leads'

export const dynamic = 'force-dynamic'

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] })),
]

export default async function StudioLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; q?: string }>
}) {
  const { status, mine, q } = await searchParams
  const active = status && LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : 'all'
  const onlyMine = mine === '1'
  const search = (q ?? '').trim()
  const me = await getStudioUser()

  const [leads, counts] = await Promise.all([
    getLeads(active === 'all' ? undefined : active, onlyMine && me ? me.id : undefined, search),
    getLeadStatusCounts(),
  ])
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const countFor = (value: string) => (value === 'all' ? totalCount : counts[value] ?? 0)

  // Build a URL that keeps the current filters, overriding the given keys.
  const hrefWith = (overrides: { status?: string; mine?: boolean; q?: string }): string => {
    const p = new URLSearchParams()
    const nextStatus = 'status' in overrides ? overrides.status : active === 'all' ? undefined : active
    const nextMine = 'mine' in overrides ? overrides.mine : onlyMine
    const nextQ = 'q' in overrides ? overrides.q : search
    if (nextStatus && nextStatus !== 'all') p.set('status', nextStatus)
    if (nextMine) p.set('mine', '1')
    if (nextQ) p.set('q', nextQ)
    const qs = p.toString()
    return qs ? `/studio/leads?${qs}` : '/studio/leads'
  }
  const exportHref = active === 'all' ? '/studio/leads/export' : `/studio/leads/export?status=${active}`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quote Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every contact and quote form submission. Newest first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
              onlyMine
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
            href={hrefWith({ mine: !onlyMine })}
          >
            {onlyMine ? '✓ My leads' : 'My leads'}
          </Link>
          <Link
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            href="/studio/pipeline"
          >
            Board view
          </Link>
          <a
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            href={exportHref}
          >
            Export CSV
          </a>
        </div>
      </header>

      <form action="/studio/leads" className="flex gap-2">
        {active !== 'all' && <input name="status" type="hidden" value={active} />}
        {onlyMine && <input name="mine" type="hidden" value="1" />}
        <input
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          defaultValue={search}
          name="q"
          placeholder="Search name, phone or email…"
          type="search"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900" type="submit">
          Search
        </button>
        {search && (
          <Link className="self-center text-sm font-medium text-slate-500 hover:text-slate-700" href={hrefWith({ q: '' })}>
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
            href={hrefWith({ status: f.value })}
            key={f.value}
          >
            {f.label}
            <span className={active === f.value ? 'text-white/80' : 'text-slate-400'}>
              {' '}
              {countFor(f.value)}
            </span>
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          {search
            ? `No leads match “${search}”.`
            : `No ${active === 'all' ? '' : LEAD_STATUS_LABEL[active].toLowerCase() + ' '}leads yet.`}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50" href={`/studio/leads/${lead.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{lead.name || 'Unnamed'}</div>
                    <div className="truncate text-xs text-slate-500">
                      {lead.service ? `${lead.service} · ` : ''}
                      {lead.phone ? `${lead.phone} · ` : ''}
                      {timeAgo(lead.createdAt)}
                    </div>
                    {lead.message && (
                      <div className="mt-0.5 truncate text-xs text-slate-400" title={lead.message}>
                        {lead.message}
                      </div>
                    )}
                  </div>
                  {lead.assigneeName && (
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:inline" title={`Owner: ${lead.assigneeName}`}>
                      {lead.assigneeName}
                    </span>
                  )}
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEAD_STATUS_BADGE[lead.status] ?? LEAD_STATUS_BADGE.new}`}>
                    {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
