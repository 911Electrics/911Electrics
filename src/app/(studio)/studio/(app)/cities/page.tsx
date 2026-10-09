import Link from 'next/link'

import { getAllCities } from '@/studio/cities'

import { CitiesList } from './CitiesList'

export const dynamic = 'force-dynamic'

export default async function StudioCitiesPage() {
  const cities = await getAllCities()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Service Areas</h1>
          <p className="mt-1 text-sm text-slate-500">{cities.length} service area{cities.length === 1 ? '' : 's'}.</p>
        </div>
        <Link
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          href="/studio/cities/new"
        >
          New service area
        </Link>
      </header>

      <CitiesList cities={cities} />
    </div>
  )
}
