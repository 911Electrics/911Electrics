import Link from 'next/link'

import { getIntegration, googleConfigured, listLocations, type GoogleLocation } from '@/lib/google'

import { DisconnectButton, LocationPicker } from './GoogleConnection'

export const dynamic = 'force-dynamic'

const ERRORS: Record<string, string> = {
  notconfigured: 'Google OAuth isn’t configured on the server yet (see setup below).',
  state: 'The sign-in didn’t match — please try connecting again.',
  norefresh: 'Google didn’t return a refresh token. Disconnect from your Google account’s third-party access and try again.',
  access_denied: 'You declined the permission request.',
}

export default async function GoogleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const configured = googleConfigured()
  const integration = configured ? await getIntegration() : null

  let locations: GoogleLocation[] = []
  let locationError: string | null = null
  if (integration?.connected) {
    try {
      locations = await listLocations()
    } catch (err) {
      locationError = err instanceof Error ? err.message : 'Could not load locations'
    }
  }

  return (
    <div className="space-y-6">
      <Link className="text-sm font-medium text-brand-600 hover:text-brand-700" href="/studio/settings">
        ← Business info
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Google Business Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your Google account to sync reviews, reply to them, and feature them on your site.
        </p>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERRORS[error] ?? decodeURIComponent(error)}
        </div>
      )}
      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Connected to Google. Choose your business location below.
        </div>
      )}

      {!configured ? (
        <SetupInstructions />
      ) : !integration?.connected ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-4 text-sm text-slate-600">
            You’ll be sent to Google to authorize access to your Business Profile.
          </p>
          {/* A real document navigation: this API route 302s to Google's OAuth
              consent screen, so <Link>'s client-side nav would not work. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            href="/api/google/connect"
          >
            Connect Google
          </a>
        </section>
      ) : (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium text-slate-800">Connected</span>
              {integration.connectedEmail && (
                <span className="text-slate-500"> · {integration.connectedEmail}</span>
              )}
            </div>
            <DisconnectButton />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Business location</p>
            {locationError ? (
              <p className="text-sm text-red-600">{locationError}</p>
            ) : (
              <LocationPicker current={integration.locationName} locations={locations} />
            )}
            {integration.locationTitle && (
              <p className="mt-2 text-xs text-slate-400">
                Currently syncing: <span className="font-medium">{integration.locationTitle}</span>
              </p>
            )}
          </div>

          {integration.locationName && (
            <p className="text-sm text-slate-500">
              Manage reviews from{' '}
              <Link className="font-medium text-brand-600 hover:text-brand-700" href="/studio/testimonials/google">
                Reviews → Google
              </Link>
              .
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function SetupInstructions() {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
      <p className="font-medium text-slate-800">Server setup required</p>
      <p>To enable the Google connection, an admin needs to set these environment variables in Vercel:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><code className="rounded bg-slate-100 px-1">GOOGLE_CLIENT_ID</code></li>
        <li><code className="rounded bg-slate-100 px-1">GOOGLE_CLIENT_SECRET</code></li>
      </ul>
      <p>Create an OAuth 2.0 “Web application” client in Google Cloud, enable the Business Profile APIs, and add this redirect URI:</p>
      <p className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
        {(process.env.NEXT_PUBLIC_SERVER_URL || 'https://your-site.com').replace(/\/$/, '')}/api/google/callback
      </p>
      <p className="text-xs text-slate-400">
        Note: the Google Business Profile (v4) reviews API requires one-time access approval from Google for your Cloud project.
      </p>
    </section>
  )
}
