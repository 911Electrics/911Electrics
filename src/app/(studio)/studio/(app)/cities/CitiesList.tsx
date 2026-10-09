'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { CityListItem } from '@/studio/cities'

import { CityRowActions } from './CityRowActions'

export function CitiesList({ cities }: { cities: CityListItem[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return cities
    return cities.filter(
      (c) => c.cityName.toLowerCase().includes(term) || (c.slug ?? '').toLowerCase().includes(term),
    )
  }, [cities, q])

  return (
    <div className="space-y-3">
      {cities.length > 8 && (
        <input
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search service areas…"
          type="search"
          value={q}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          {q ? `No service areas match “${q}”.` : 'No service areas yet.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <li className="flex items-center gap-3 px-5 py-3.5" key={c.id}>
                <Link className="min-w-0 flex-1" href={`/studio/cities/${c.id}`}>
                  <div className="truncate text-sm font-medium text-slate-900">{c.cityName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {c.pathOverride || (c.slug ? `/${c.slug}/` : 'no slug')}
                  </div>
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    c.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {c.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <CityRowActions id={c.id} pathOverride={c.pathOverride} slug={c.slug} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
