import Link from 'next/link'

import {
  LEAD_STATUS_BADGE,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from '@/studio/constants'
import type { DayPoint, SourcePoint, StagePoint } from '@/studio/dashboard'

export const money = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`

export function formatMins(mins: number | null): string {
  if (mins == null) return '—'
  if (mins < 60) return `${mins} min`
  const h = mins / 60
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)} hr`
  return `${Math.round(h / 24)} d`
}

export function Kpi({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string
  value: string | number
  sub?: React.ReactNode
  accent?: boolean
  href?: string
}) {
  const inner = (
    <>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={`text-2xl font-bold leading-none ${accent ? 'text-brand-700' : 'text-slate-900'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </>
  )
  const cls = `flex flex-col gap-1.5 rounded-xl border p-4 ${
    accent ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'
  }`
  return href ? (
    <Link className={`${cls} transition hover:-translate-y-0.5 hover:shadow-sm`} href={href}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-slate-400">no change</span>
  if (previous === 0) return <span className="font-medium text-green-600">new this week</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  const up = pct >= 0
  return (
    <span className={`font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs last week
    </span>
  )
}

export function TrendBars({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {data.map((d) => (
          <div className="group relative flex flex-1 flex-col items-center justify-end" key={d.day}>
            <div
              className="w-full rounded-t bg-brand-400 transition group-hover:bg-brand-600"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }}
              title={`${d.day}: ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
        <span>{new Date(data[0]?.day ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export function Funnel({ stages }: { stages: StagePoint[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count))
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div className="flex items-center gap-3" key={s.status}>
          <span className="w-20 shrink-0 text-xs font-medium text-slate-600">
            {LEAD_STATUS_LABEL[s.status]}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className={`flex h-full items-center justify-end rounded px-2 text-[11px] font-semibold ${
                LEAD_STATUS_BADGE[s.status] ?? LEAD_STATUS_BADGE.new
              }`}
              style={{ width: `${Math.max((s.count / max) * 100, s.count > 0 ? 12 : 0)}%` }}
            >
              {s.count > 0 && s.count}
            </div>
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-slate-400">
            {s.value > 0 ? money(s.value) : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SourceBars({ sources }: { sources: SourcePoint[] }) {
  if (sources.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>
  const max = Math.max(1, ...sources.map((s) => s.count))
  return (
    <div className="space-y-2">
      {sources.map((s) => (
        <div className="flex items-center gap-3" key={s.source}>
          <span className="w-24 shrink-0 truncate text-xs font-medium capitalize text-slate-600" title={s.source}>
            {s.source}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-400" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs text-slate-500">{s.count}</span>
        </div>
      ))}
    </div>
  )
}

export function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function statusBadge(status: LeadStatus) {
  return `rounded-full px-2 py-0.5 text-[11px] font-semibold ${
    LEAD_STATUS_BADGE[status] ?? LEAD_STATUS_BADGE.new
  }`
}
