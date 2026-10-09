import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updateCity } from '@/app/actions/studio-cities'
import { getCityById } from '@/studio/cities'
import { getAllMedia } from '@/studio/media'

import { CityForm } from '../CityForm'

export const dynamic = 'force-dynamic'

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cityId = Number(id)
  if (Number.isNaN(cityId)) notFound()

  const [city, mediaItems] = await Promise.all([getCityById(cityId), getAllMedia()])
  if (!city) notFound()

  const action = updateCity.bind(null, cityId)

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/cities">
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to service areas
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit service area</h1>
      </header>
      <CityForm action={action} initial={city} mediaItems={mediaItems} submitLabel="Save service area" />
    </div>
  )
}
