import { getRedirects } from '@/studio/redirects'

import { RedirectsManager } from './RedirectsManager'

export const dynamic = 'force-dynamic'

export default async function RedirectsPage() {
  const redirects = await getRedirects()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Redirects</h1>
        <p className="mt-1 text-sm text-slate-500">
          Send old URLs to new ones with a 301, so search rankings and links carry over — essential
          when migrating from the old site.
        </p>
      </header>
      <RedirectsManager redirects={redirects} />
    </div>
  )
}
