'use client'

import { LoaderCircle, ShieldCheck, ShieldOff } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'

import {
  beginTotpSetup,
  confirmTotpSetup,
  disableTotp,
  regenerateRecoveryCodes,
  type BeginSetupResult,
} from '@/app/actions/studio-2fa'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">Save your recovery codes</p>
      <p className="mt-1 text-xs text-amber-700">
        Each can be used once if you lose your authenticator. They won’t be shown again.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-slate-800">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <button
        className="mt-3 text-xs font-semibold text-amber-800 underline"
        onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
        type="button"
      >
        Copy all
      </button>
    </div>
  )
}

export function TwoFactorSection({
  enabled: initialEnabled,
  recoveryRemaining,
}: {
  enabled: boolean
  recoveryRemaining: number
}) {
  const [enabled, setEnabled] = useState(initialEnabled)

  if (enabled) {
    return (
      <EnabledPanel
        onDisabled={() => setEnabled(false)}
        recoveryRemaining={recoveryRemaining}
      />
    )
  }
  return <SetupPanel onEnabled={() => setEnabled(true)} />
}

function SetupPanel({ onEnabled }: { onEnabled: () => void }) {
  const [setup, setSetup] = useState<Extract<BeginSetupResult, { ok: true }> | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, startTransition] = useTransition()
  const [confirmState, confirmAction, confirming] = useActionState(confirmTotpSetup, {
    ok: false,
    error: '',
  } as Awaited<ReturnType<typeof confirmTotpSetup>>)

  if (confirmState.ok) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <ShieldCheck className="size-5" /> Two-factor authentication is on.
        </div>
        <RecoveryCodes codes={confirmState.recoveryCodes} />
        <button className={btnGhost} onClick={onEnabled} type="button">
          Done
        </button>
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Add a second step to your sign-in using an authenticator app such as Google
          Authenticator, 1Password, or Authy.
        </p>
        {startError && <p className="text-sm text-red-700">{startError}</p>}
        <button
          className={btnPrimary}
          disabled={starting}
          onClick={() =>
            startTransition(async () => {
              setStartError(null)
              const res = await beginTotpSetup()
              if (res.ok) setSetup(res)
              else setStartError(res.error)
            })
          }
          type="button"
        >
          {starting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          Enable two-factor
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4 text-sm text-slate-600">
        <li>
          <span className="font-medium text-slate-800">1. Scan this QR code</span> with your
          authenticator app.
          <div className="mt-2 inline-block rounded-xl border border-slate-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="2FA QR code" height={220} src={setup.qr} width={220} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Can’t scan? Enter this key manually:
            <br />
            <span className="font-mono text-slate-800">{setup.secretDisplay}</span>
          </p>
        </li>
        <li>
          <form action={confirmAction} className="space-y-3">
            <span className="font-medium text-slate-800">2. Enter the 6-digit code</span> it shows.
            <input
              autoComplete="one-time-code"
              className={`${inputCls} max-w-[12rem] text-center text-lg tracking-[0.3em]`}
              inputMode="numeric"
              name="code"
              placeholder="123456"
              required
            />
            {confirmState.error && <p className="text-sm text-red-700">{confirmState.error}</p>}
            <div>
              <button className={btnPrimary} disabled={confirming} type="submit">
                {confirming && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                Verify & turn on
              </button>
            </div>
          </form>
        </li>
      </ol>
    </div>
  )
}

function EnabledPanel({
  onDisabled,
  recoveryRemaining,
}: {
  onDisabled: () => void
  recoveryRemaining: number
}) {
  const [showDisable, setShowDisable] = useState(false)
  const [showRegen, setShowRegen] = useState(false)

  const [disableState, disableAction, disabling] = useActionState(disableTotp, {
    ok: false,
    error: '',
  } as Awaited<ReturnType<typeof disableTotp>>)
  const [regenState, regenAction, regenerating] = useActionState(regenerateRecoveryCodes, {
    ok: false,
    error: '',
  } as Awaited<ReturnType<typeof regenerateRecoveryCodes>>)

  // When the disable action succeeds, swap the panel back to setup.
  useEffect(() => {
    if (disableState.ok) onDisabled()
  }, [disableState.ok, onDisabled])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <ShieldCheck className="size-5" /> Two-factor authentication is on.
      </div>
      <p className="text-sm text-slate-500">
        {recoveryRemaining} recovery code{recoveryRemaining === 1 ? '' : 's'} remaining.
      </p>

      {regenState.ok ? (
        <RecoveryCodes codes={regenState.recoveryCodes} />
      ) : showRegen ? (
        <form action={regenAction} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">
            Enter a current authenticator code to issue new recovery codes.
          </p>
          <input
            autoComplete="one-time-code"
            className={`${inputCls} max-w-[12rem] text-center text-lg tracking-[0.3em]`}
            inputMode="numeric"
            name="code"
            placeholder="123456"
            required
          />
          {regenState.error && <p className="text-sm text-red-700">{regenState.error}</p>}
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={regenerating} type="submit">
              {regenerating && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              Regenerate
            </button>
            <button className={btnGhost} onClick={() => setShowRegen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showDisable ? (
        <form action={disableAction} className="space-y-3 rounded-lg border border-red-200 p-4">
          <p className="text-sm font-medium text-slate-700">
            Enter your password to turn off two-factor authentication.
          </p>
          <input
            autoComplete="current-password"
            className={`${inputCls} max-w-xs`}
            name="password"
            placeholder="Your password"
            required
            type="password"
          />
          {!disableState.ok && disableState.error && (
            <p className="text-sm text-red-700">{disableState.error}</p>
          )}
          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              disabled={disabling}
              type="submit"
            >
              {disabling && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              <ShieldOff className="size-4" /> Turn off
            </button>
            <button className={btnGhost} onClick={() => setShowDisable(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!showDisable && !showRegen && !regenState.ok && (
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => setShowRegen(true)} type="button">
            Regenerate recovery codes
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            onClick={() => setShowDisable(true)}
            type="button"
          >
            <ShieldOff className="size-4" /> Disable
          </button>
        </div>
      )}
    </div>
  )
}
