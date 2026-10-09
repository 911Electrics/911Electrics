'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { createApiKeyAction, revokeApiKeyAction } from '@/app/actions/studio-api-keys'
import { API_CATALOG } from '@/lib/api-catalog'
import {
  API_ACTIONS,
  API_KEY_PRESETS,
  API_RESOURCE_LABEL,
  API_RESOURCES,
  grantsAllow,
  type ApiGrant,
  type ApiScope,
} from '@/lib/api-scopes'
import type { ApiKeyRecord, ApiKeyStatus } from '@/studio/api-keys'
import { timeAgo } from '@/studio/constants'

type KeyRow = ApiKeyRecord & { status: ApiKeyStatus }

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

const STATUS_CLS: Record<ApiKeyStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  expired: 'bg-amber-50 text-amber-700 ring-amber-200',
  revoked: 'bg-slate-100 text-slate-500 ring-slate-200',
}

/** Only scopes some endpoint actually asks for — no boxes that do nothing. */
const LIVE_SCOPES = new Set<ApiScope>(API_CATALOG.flatMap((e) => e.operations.map((o) => o.scope)))
const LIVE_RESOURCES = API_RESOURCES.filter((r) =>
  API_ACTIONS.some((a) => LIVE_SCOPES.has(`${r}:${a}`)),
)

export function ApiKeysManager({
  keys,
  legacy,
}: {
  keys: KeyRow[]
  legacy: { blog: boolean; leads: boolean }
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [minted, setMinted] = useState<{ key: string; name: string } | null>(null)

  return (
    <div className="space-y-5">
      {minted && <NewKeyNotice minted={minted} onDismiss={() => setMinted(null)} />}

      {!creating && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          onClick={() => setCreating(true)}
          type="button"
        >
          Create key
        </button>
      )}

      {creating && (
        <CreateForm
          onCancel={() => setCreating(false)}
          onCreated={(m) => {
            setMinted(m)
            setCreating(false)
            router.refresh()
          }}
        />
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-slate-400">No keys yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Permissions</th>
                <th className="px-4 py-2.5 font-medium">Last used</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => (
                <tr className={k.status === 'active' ? '' : 'opacity-60'} key={k.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-slate-900">{k.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">e911_{k.prefix}_…</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Created {timeAgo(k.createdAt)}
                      {k.createdByEmail ? ` by ${k.createdByEmail}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex max-w-md flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                            s === '*' || s.startsWith('leads')
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                          key={s}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {k.lastUsedAt ? timeAgo(k.lastUsedAt) : 'Never'}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_CLS[k.status]}`}
                    >
                      {k.status}
                    </span>
                    {k.status === 'active' && k.expiresAt && (
                      <p className="mt-1 text-xs text-slate-400">
                        Expires {new Date(k.expiresAt).toLocaleDateString('en-US')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {k.status === 'active' && (
                      <RevokeButton id={k.id} name={k.name} onDone={() => router.refresh()} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(legacy.blog || legacy.leads) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Legacy tokens still accepted</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {legacy.blog && (
              <li>
                <code>BLOG_API_TOKEN</code> — a fixed content key (posts, services, service areas,
                reviews, cache)
                {legacy.leads ? '.' : ', and it can also export quote requests until LEADS_API_TOKEN is set or the automation moves to a key from this page.'}
              </li>
            )}
            {legacy.leads && (
              <li>
                <code>LEADS_API_TOKEN</code> — read-only quote-request export.
              </li>
            )}
          </ul>
          <p className="mt-2">
            These live in Vercel env vars, so they cannot be revoked here. Once every integration
            uses a key from this page, remove them from Vercel.
          </p>
        </div>
      )}
    </div>
  )
}

function NewKeyNotice({
  minted,
  onDismiss,
}: {
  minted: { key: string; name: string }
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-sm font-semibold text-emerald-900">
        Key &ldquo;{minted.name}&rdquo; created — copy it now
      </p>
      <p className="mt-1 text-sm text-emerald-800">
        This is the only time it is shown. It is stored as a hash and cannot be recovered; if you
        lose it, revoke it and create another.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 font-mono text-xs break-all text-slate-800 ring-1 ring-emerald-200">
          {minted.key}
        </code>
        <button
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(minted.key)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
          type="button"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          className="text-sm font-medium text-emerald-800 hover:underline"
          onClick={onDismiss}
          type="button"
        >
          I&rsquo;ve saved it
        </button>
      </div>
    </div>
  )
}

function CreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (m: { key: string; name: string }) => void
  onCancel: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [picked, setPicked] = useState<Set<ApiScope>>(new Set())

  const applyPreset = (grants: ApiGrant[]) => {
    setAll(grants.includes('*'))
    setPicked(new Set([...LIVE_SCOPES].filter((s) => grantsAllow(grants, s))))
  }
  const toggle = (scope: ApiScope) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })

  const readsCustomerData = useMemo(() => all || picked.has('leads:read'), [all, picked])

  return (
    <form
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          setError(null)
          const res = await createApiKeyAction(fd)
          if (res.ok) onCreated({ key: res.key, name: res.name })
          else setError(res.error)
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="name">
            Name — who or what uses this key
          </label>
          <input
            className={inputCls}
            id="name"
            maxLength={60}
            minLength={3}
            name="name"
            placeholder="Daily blog writer"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expiresInDays">
            Expires
          </label>
          <select className={inputCls} defaultValue="0" id="expiresInDays" name="expiresInDays">
            <option value="0">Never</option>
            <option value="30">In 30 days</option>
            <option value="90">In 90 days</option>
            <option value="365">In 1 year</option>
          </select>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Start from</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {API_KEY_PRESETS.map((p) => (
            <button
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              key={p.id}
              onClick={() => applyPreset(p.grants)}
              title={p.hint}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Permissions</legend>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Resource</th>
                {API_ACTIONS.map((a) => (
                  <th className="w-24 px-3 py-2 text-center font-medium" key={a}>
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LIVE_RESOURCES.map((r) => (
                <tr key={r}>
                  <td className="px-3 py-2 text-slate-700">{API_RESOURCE_LABEL[r]}</td>
                  {API_ACTIONS.map((a) => {
                    const scope: ApiScope = `${r}:${a}`
                    return (
                      <td className="px-3 py-2 text-center" key={a}>
                        {LIVE_SCOPES.has(scope) ? (
                          <input
                            aria-label={`${API_RESOURCE_LABEL[r]} — ${a}`}
                            checked={all || picked.has(scope)}
                            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                            disabled={all}
                            name="scopes"
                            onChange={() => toggle(scope)}
                            type="checkbox"
                            value={scope}
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
          <input
            checked={all}
            className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
            name="scopes"
            onChange={(e) => setAll(e.target.checked)}
            type="checkbox"
            value="*"
          />
          <span>
            <span className="font-medium">Full access</span> — everything above, plus anything added
            to the API later. For a trusted agent only.
          </span>
        </label>
      </fieldset>

      {readsCustomerData && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          This key can read quote requests — customer names, phone numbers, emails and addresses.
          Only give it to something that needs them.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Creating…' : 'Create key'}
        </button>
        <button
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function RevokeButton({ id, name, onDone }: { id: number; name: string; onDone: () => void }) {
  const [pending, start] = useTransition()
  return (
    <button
      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Revoke "${name}"? Anything using it stops working immediately.`)) return
        start(async () => {
          await revokeApiKeyAction(id)
          onDone()
        })
      }}
      type="button"
    >
      {pending ? 'Revoking…' : 'Revoke'}
    </button>
  )
}
