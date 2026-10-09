import { getIntegrationStatuses } from '@/studio/integration-status'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const integrations = await getIntegrationStatuses()
  const connected = integrations.filter((i) => i.ok).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          {connected} of {integrations.length} integrations connected. Set the keys in your hosting
          environment (Vercel → Settings → Environment Variables), then redeploy.
        </p>
      </header>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {integrations.map((i) => (
          <li className="flex items-start gap-3 px-5 py-4" key={i.name}>
            <span
              aria-hidden
              className={`mt-1 size-2.5 shrink-0 rounded-full ${i.ok ? 'bg-green-500' : 'bg-slate-300'}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{i.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    i.ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {i.ok ? 'Connected' : 'Not set'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{i.detail}</p>
              {!i.ok && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.envVars.map((v) => (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600" key={v}>
                      {v}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-400">
        Everything works without these — each feature simply stays dormant until its keys are set.
      </p>
    </div>
  )
}
