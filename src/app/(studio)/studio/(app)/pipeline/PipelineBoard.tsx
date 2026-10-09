'use client'

import { useRouter } from 'next/navigation'
import { useOptimistic, useState, useTransition } from 'react'

import { updateLeadStatus } from '@/app/actions/studio-leads'
import {
  LEAD_STATUS_LABEL,
  PIPELINE_STAGES,
  timeAgo,
  type LeadStatus,
} from '@/studio/constants'

export type PipelineCard = {
  id: number
  name: string
  service: string | null
  phone: string
  status: LeadStatus
  estimatedValue: number | null
  createdAt: string
  assigneeName: string | null
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const COLUMN_ACCENT: Record<LeadStatus, string> = {
  new: 'border-t-brand-500',
  contacted: 'border-t-amber-400',
  quoted: 'border-t-blue-400',
  won: 'border-t-green-500',
  lost: 'border-t-slate-300',
  spam: 'border-t-slate-300',
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function PipelineBoard({ initialCards }: { initialCards: PipelineCard[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [cards, setCards] = useState(initialCards)
  const [optimisticCards, moveOptimistic] = useOptimistic(
    cards,
    (state: PipelineCard[], move: { id: number; status: LeadStatus }) =>
      state.map((c) => (c.id === move.id ? { ...c, status: move.status } : c)),
  )
  const [dragId, setDragId] = useState<number | null>(null)
  const [overStage, setOverStage] = useState<LeadStatus | null>(null)

  const move = (id: number, status: LeadStatus) => {
    const card = optimisticCards.find((c) => c.id === id)
    if (!card || card.status === status) return
    startTransition(async () => {
      moveOptimistic({ id, status })
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
      await updateLeadStatus(id, status)
      router.refresh()
    })
  }

  const byStage = (stage: LeadStatus) => optimisticCards.filter((c) => c.status === stage)
  const stageValue = (stage: LeadStatus) =>
    byStage(stage).reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const items = byStage(stage)
        const value = stageValue(stage)
        return (
          <div
            className={`flex w-72 shrink-0 flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-50/60 ${COLUMN_ACCENT[stage]} ${
              overStage === stage ? 'ring-2 ring-brand-400' : ''
            }`}
            key={stage}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDragOver={(e) => {
              e.preventDefault()
              if (overStage !== stage) setOverStage(stage)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setOverStage(null)
              if (dragId != null) move(dragId, stage)
              setDragId(null)
            }}
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {LEAD_STATUS_LABEL[stage]}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {items.length}
                </span>
              </div>
              {value > 0 && <span className="text-xs font-medium text-slate-500">{money(value)}</span>}
            </div>

            <div className="flex-1 space-y-2 px-2.5 pb-3">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-400">Drop leads here</p>
              ) : (
                items.map((card) => (
                  <article
                    className={`group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition active:cursor-grabbing ${
                      dragId === card.id ? 'opacity-50' : 'hover:border-brand-300 hover:shadow'
                    }`}
                    draggable
                    key={card.id}
                    onClick={() => router.push(`/studio/leads/${card.id}`)}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverStage(null)
                    }}
                    onDragStart={() => setDragId(card.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {card.name || 'Unnamed'}
                      </span>
                      {card.estimatedValue != null && (
                        <span className="shrink-0 text-xs font-semibold text-green-700">
                          {money(card.estimatedValue)}
                        </span>
                      )}
                    </div>
                    {card.service && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{card.service}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span className="truncate">{card.phone}</span>
                      <span className="shrink-0">{timeAgo(card.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {card.assigneeName ? (
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
                            title={card.assigneeName}
                          >
                            {initials(card.assigneeName)}
                          </span>
                          <span className="truncate text-[11px] text-slate-500">{card.assigneeName}</span>
                        </div>
                      ) : (
                        <span />
                      )}
                      {/* Touch-friendly stage move (drag is desktop-only). */}
                      <select
                        aria-label="Move to stage"
                        className="shrink-0 rounded border border-slate-200 bg-white py-0.5 pl-1 pr-4 text-[11px] text-slate-500 focus:border-brand-500 focus:outline-none"
                        onChange={(e) => move(card.id, e.target.value as LeadStatus)}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        value={card.status}
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
