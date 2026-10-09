import Link from 'next/link'

import { getAllServices } from '@/studio/services'

import { ServiceRowActions } from './ServiceRowActions'

export const dynamic = 'force-dynamic'

export default async function StudioServicesPage() {
  const services = await getAllServices()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="mt-1 text-sm text-slate-500">{services.length} service{services.length === 1 ? '' : 's'}.</p>
        </div>
        <Link
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          href="/studio/services/new"
        >
          New service
        </Link>
      </header>

      {services.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          No services yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {services.map((s) => (
              <li className="flex items-center gap-3 px-5 py-3.5" key={s.id}>
                <span className="w-6 shrink-0 text-xs font-medium text-slate-400">
                  {s.displayOrder ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{s.title}</div>
                  <div className="truncate text-xs text-slate-500">{s.slug ? `/${s.slug}` : 'no slug'}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <ServiceRowActions id={s.id} slug={s.slug} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
