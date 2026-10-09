import { API_BASE } from '@/lib/api-catalog'
import { apiKeyStatus, getApiKeys } from '@/studio/api-keys'

import { ApiKeysManager } from './ApiKeysManager'

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
  const keys = await getApiKeys()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Keys let an automation or an AI agent manage the site through the admin API (
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{API_BASE}</code>) without a
          Studio login. Give each one only what it needs, and its own key — every change it makes
          is recorded in the audit log under the key&rsquo;s name, and a key can be revoked here
          instantly.
        </p>
      </header>

      {keys === null ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">One-time setup needed</p>
          <p className="mt-1">
            The <code>api_keys</code> table has not been created yet. Run{' '}
            <code>db/migrations/20260918_api_keys.sql</code> in the Supabase SQL editor, then reload
            this page. Until then the existing <code>BLOG_API_TOKEN</code> keeps working as before.
          </p>
        </div>
      ) : (
        <ApiKeysManager
          keys={keys.map((k) => ({ ...k, status: apiKeyStatus(k) }))}
          legacy={{
            blog: Boolean(process.env.BLOG_API_TOKEN),
            leads: Boolean(process.env.LEADS_API_TOKEN),
          }}
        />
      )}
    </div>
  )
}
