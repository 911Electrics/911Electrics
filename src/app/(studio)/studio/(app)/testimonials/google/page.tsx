import Link from 'next/link'

import { getIntegration, googleConfigured } from '@/lib/google'
import { getSiteSettings } from '@/lib/queries'
import { timeAgo } from '@/studio/constants'
import { getGoogleReviews, getGoogleReviewStats } from '@/studio/google-reviews'
import { getTemplates } from '@/studio/templates'

import { FeatureToggle, ReplyForm, SyncButton } from './GoogleReviewsClient'

export const dynamic = 'force-dynamic'

function Stars({ n }: { n: number | null }) {
  const count = n ?? 0
  return (
    <span className="text-amber-500" title={`${count} star${count === 1 ? '' : 's'}`}>
      {'★'.repeat(count)}
      <span className="text-slate-300">{'★'.repeat(5 - count)}</span>
    </span>
  )
}

export default async function GoogleReviewsPage() {
  const integration = googleConfigured() ? await getIntegration() : null
  const connected = Boolean(integration?.connected && integration?.locationName)

  const [reviews, stats, templates, settings] = await Promise.all([
    getGoogleReviews(),
    getGoogleReviewStats(),
    getTemplates('review'),
    getSiteSettings().catch(() => null),
  ])

  return (
    <div className="space-y-6">
      <Link className="text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/testimonials">
        ← All reviews
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Google reviews</h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.count > 0
              ? `${stats.count} synced · ${stats.average?.toFixed(1) ?? '—'}★ average · ${stats.replied} replied`
              : 'Sync your Google Business Profile reviews to manage and feature them.'}
          </p>
        </div>
        {connected && <SyncButton />}
      </header>

      {!connected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {googleConfigured() ? (
            <>
              Google isn’t fully set up yet. An admin can connect it under{' '}
              <Link className="font-semibold underline" href="/studio/settings/google">
                Business info → Google Business Profile
              </Link>
              .
            </>
          ) : (
            <>Google Business Profile isn’t configured on the server yet. Ask an admin to set it up.</>
          )}
          {integration?.lastSyncError && (
            <p className="mt-1 text-xs text-amber-700">Last sync error: {integration.lastSyncError}</p>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          No Google reviews synced yet{connected ? ' — hit “Sync now”.' : '.'}
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li className="rounded-xl border border-slate-200 bg-white p-5" key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{r.reviewerName ?? 'Google reviewer'}</span>
                    <Stars n={r.starRating} />
                  </div>
                  <p className="text-xs text-slate-400">{r.createTime ? timeAgo(r.createTime) : ''}</p>
                </div>
                <FeatureToggle featured={r.featured} id={r.id} />
              </div>

              {r.comment && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>}

              <div className="mt-4 border-t border-slate-100 pt-4">
                {r.replyComment && (
                  <p className="mb-2 text-xs text-slate-400">
                    Your reply{r.replyUpdateTime ? ` · ${timeAgo(r.replyUpdateTime)}` : ''}
                  </p>
                )}
                {connected ? (
                  <ReplyForm
                    businessName={settings?.businessName}
                    existing={r.replyComment}
                    id={r.id}
                    reviewerName={r.reviewerName}
                    templates={templates}
                  />
                ) : r.replyComment ? (
                  <p className="text-sm text-slate-600">{r.replyComment}</p>
                ) : (
                  <p className="text-xs text-slate-400">Connect Google to reply.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
