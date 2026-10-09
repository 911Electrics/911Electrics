import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updateService } from '@/app/actions/studio-services'
import { getAllMedia } from '@/studio/media'
import { getServiceById } from '@/studio/services'

import { ServiceForm } from '../ServiceForm'

export const dynamic = 'force-dynamic'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const serviceId = Number(id)
  if (Number.isNaN(serviceId)) notFound()

  const [service, mediaItems] = await Promise.all([getServiceById(serviceId), getAllMedia()])
  if (!service) notFound()

  const action = updateService.bind(null, serviceId)

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/services">
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to services
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit service</h1>
      </header>
      <ServiceForm action={action} initial={service} mediaItems={mediaItems} submitLabel="Save service" />
    </div>
  )
}
