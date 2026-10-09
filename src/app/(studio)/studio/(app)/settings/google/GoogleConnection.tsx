'use client'

import { useState, useTransition } from 'react'

import { disconnectGoogleAction, selectGoogleLocation } from '@/app/actions/google'
import type { GoogleLocation } from '@/lib/google'

const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'

export function LocationPicker({
  locations,
  current,
}: {
  locations: GoogleLocation[]
  current: string | null
}) {
  const [pending, start] = useTransition()
  const [selected, setSelected] = useState(current ?? '')
  const [saved, setSaved] = useState(false)

  if (locations.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No business locations were returned for this Google account. Make sure the connected account
        manages your Business Profile and that the Business Profile APIs are enabled.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
        onChange={(e) => {
          setSelected(e.target.value)
          setSaved(false)
        }}
        value={selected}
      >
        <option disabled value="">
          Choose your business…
        </option>
        {locations.map((l) => (
          <option key={l.name} value={l.name}>
            {l.title}
          </option>
        ))}
      </select>
      <button
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending || !selected}
        onClick={() => {
          const loc = locations.find((l) => l.name === selected)
          if (!loc) return
          start(async () => {
            await selectGoogleLocation(loc.accountName, loc.name, loc.title)
            setSaved(true)
          })
        }}
        type="button"
      >
        {pending ? 'Saving…' : 'Use this location'}
      </button>
      {saved && <span className="text-sm text-green-700">Saved.</span>}
    </div>
  )
}

export function DisconnectButton() {
  const [pending, start] = useTransition()
  return (
    <button
      className={btnGhost}
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Disconnect Google Business Profile? Synced reviews stay, but sync and replies will stop until you reconnect.')) return
        start(async () => {
          await disconnectGoogleAction()
        })
      }}
      type="button"
    >
      {pending ? 'Disconnecting…' : 'Disconnect'}
    </button>
  )
}
