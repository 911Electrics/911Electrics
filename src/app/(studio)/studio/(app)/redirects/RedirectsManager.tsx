'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  bulkAddRedirects,
  createRedirect,
  deleteRedirect,
  updateRedirect,
} from '@/app/actions/studio-redirects'
import type { UrlRedirect } from '@/studio/redirects'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

export function RedirectsManager({ redirects }: { redirects: UrlRedirect[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<UrlRedirect | 'new' | null>(null)
  const [showBulk, setShowBulk] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {!editing && (
          <button
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            onClick={() => setEditing('new')}
            type="button"
          >
            Add redirect
          </button>
        )}
        <button
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          onClick={() => setShowBulk((v) => !v)}
          type="button"
        >
          Bulk import
        </button>
      </div>

      {showBulk && <BulkImport onDone={() => { setShowBulk(false); router.refresh() }} />}

      {editing && (
        <Editor
          initial={editing === 'new' ? null : editing}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}

      {redirects.length === 0 ? (
        <p className="text-sm text-slate-400">No redirects yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">From</th>
                <th className="px-4 py-2.5 font-medium">To</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {redirects.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.source}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.destination}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.permanent ? '301' : '302'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="mr-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      onClick={() => setEditing(r)}
                      type="button"
                    >
                      Edit
                    </button>
                    <DeleteButton id={r.id} onDone={() => router.refresh()} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Redirects take effect on the next deployment. 301 = permanent (passes SEO equity); 302 =
        temporary.
      </p>
    </div>
  )
}

function Editor({ initial, onDone }: { initial: UrlRedirect | null; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          setError(null)
          const res = initial ? await updateRedirect(initial.id, fd) : await createRedirect(fd)
          if (res.ok) onDone()
          else setError(res.error)
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="source">From (old path)</label>
          <input className={inputCls} defaultValue={initial?.source ?? ''} id="source" name="source" placeholder="/services/electrical/residential/" required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="destination">To</label>
          <input className={inputCls} defaultValue={initial?.destination ?? ''} id="destination" name="destination" placeholder="/electrical-repairs-los-angeles-ca/" required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30" defaultChecked={initial?.permanent ?? true} name="permanent" type="checkbox" />
        Permanent (301)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? 'Saving…' : initial ? 'Save' : 'Add redirect'}
        </button>
        <button className="text-sm font-medium text-slate-500 hover:text-slate-700" onClick={onDone} type="button">Cancel</button>
      </div>
    </form>
  )
}

function BulkImport({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition()
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-700">Bulk import</p>
      <p className="text-xs text-slate-500">One redirect per line, as <code className="rounded bg-slate-100 px-1">/old-path/, /new-path/</code>. Existing sources are updated.</p>
      <textarea
        className={`${inputCls} font-mono`}
        onChange={(e) => setText(e.target.value)}
        placeholder={'/services/electrical/, /services/\n/our-company/, /contact/'}
        rows={8}
        value={text}
      />
      {result && <p className="text-sm text-green-700">{result}</p>}
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending || !text.trim()}
          onClick={() => start(async () => {
            const res = await bulkAddRedirects(text)
            setResult(`Imported ${res.added}, skipped ${res.skipped}.`)
            setText('')
            onDone()
          })}
          type="button"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  )
}

function DeleteButton({ id, onDone }: { id: number; onDone: () => void }) {
  const [pending, start] = useTransition()
  return (
    <button
      className="text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Delete this redirect?')) return
        start(async () => { await deleteRedirect(id); onDone() })
      }}
      type="button"
    >
      {pending ? '…' : 'Delete'}
    </button>
  )
}
