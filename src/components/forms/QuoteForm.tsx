'use client'

import { LoaderCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import React, { useActionState, useEffect, useRef, useState } from 'react'

import { submitLead, type LeadFormState } from '@/app/actions/submit-lead'
import { cn } from '@/utilities/ui'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

const SERVICE_OPTIONS = [
  'Electrical Repairs',
  'Electrical Panel Upgrade',
  'EV Charger Installation',
  'New Construction',
  'Lighting Installation',
  'Emergency Service',
  'Other',
]

const initialState: LeadFormState = { status: 'idle' }

const inputClass =
  'w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-muted-foreground focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function QuoteForm({
  defaultService,
  formLocation,
  withMessage = false,
}: {
  defaultService?: string
  formLocation: 'hero' | 'contact' | 'contact-page'
  withMessage?: boolean
}) {
  const [state, formAction, pending] = useActionState(submitLead, initialState)
  const pathname = usePathname()
  const [startedAt, setStartedAt] = useState(0)
  const trackedRef = useRef(false)

  // Time-trap baseline — set on mount so bots that POST instantly are dropped
  useEffect(() => {
    setStartedAt(Date.now())
  }, [])

  useEffect(() => {
    if (state.status === 'success' && !trackedRef.current) {
      trackedRef.current = true
      window.gtag?.('event', 'generate_lead', { form_location: formLocation })
    }
  }, [state.status, formLocation])

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-5 text-center" role="status">
        <p className="text-lg font-semibold text-brand-800">Request received ✓</p>
        <p className="mt-1 text-sm text-navy-900">
          {state.message ?? 'We will call you shortly.'}
        </p>
      </div>
    )
  }

  const utm =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined

  return (
    <form action={formAction} className="mt-4 space-y-3.5">
      {/* Spam traps */}
      <input
        aria-hidden
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        name="company_website"
        tabIndex={-1}
        type="text"
      />
      <input name="startedAt" type="hidden" value={startedAt} />
      <input name="sourcePath" type="hidden" value={pathname ?? ''} />
      <input name="formLocation" type="hidden" value={formLocation} />
      {['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].map((k) => {
        const v = utm?.get(k)
        return v ? <input key={k} name={k} type="hidden" value={v} /> : null
      })}

      <div>
        <label className="sr-only" htmlFor={`${formLocation}-service`}>
          Service needed
        </label>
        <select
          className={inputClass}
          defaultValue={defaultService ?? ''}
          id={`${formLocation}-service`}
          name="service"
        >
          <option disabled value="">
            What do you need help with?
          </option>
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="sr-only" htmlFor={`${formLocation}-name`}>
            Full name
          </label>
          <input
            autoComplete="name"
            className={cn(inputClass, state.fieldErrors?.name && 'border-destructive')}
            id={`${formLocation}-name`}
            name="name"
            placeholder="Full name *"
            required
            type="text"
          />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div>
          <label className="sr-only" htmlFor={`${formLocation}-phone`}>
            Phone number
          </label>
          <input
            autoComplete="tel"
            className={cn(inputClass, state.fieldErrors?.phone && 'border-destructive')}
            id={`${formLocation}-phone`}
            inputMode="tel"
            name="phone"
            // Require at least 10 digits (any common separators allowed) so
            // obvious typos are caught in the browser before submit.
            pattern="(\D*\d){10,}\D*"
            placeholder="Phone number *"
            required
            title="Please enter a valid phone number (at least 10 digits)."
            type="tel"
          />
          {state.fieldErrors?.phone && (
            <p className="mt-1 text-xs text-destructive">{state.fieldErrors.phone}</p>
          )}
        </div>
      </div>

      <div>
        <label className="sr-only" htmlFor={`${formLocation}-email`}>
          Email
        </label>
        <input
          autoComplete="email"
          className={cn(inputClass, state.fieldErrors?.email && 'border-destructive')}
          id={`${formLocation}-email`}
          name="email"
          placeholder="Email address"
          type="email"
        />
        {state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label className="sr-only" htmlFor={`${formLocation}-address`}>
          Service address
        </label>
        <input
          autoComplete="street-address"
          className={inputClass}
          id={`${formLocation}-address`}
          name="address"
          placeholder="Service address (city or ZIP is fine)"
          type="text"
        />
      </div>

      {withMessage && (
        <div>
          <label className="sr-only" htmlFor={`${formLocation}-message`}>
            Message
          </label>
          <textarea
            className={cn(inputClass, 'min-h-28')}
            id={`${formLocation}-message`}
            name="message"
            placeholder="Tell us about the job…"
          />
        </div>
      )}

      {/* Cloudflare Turnstile — renders only when configured; auto-injects the
          cf-turnstile-response field the server verifies. */}
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
        </>
      )}

      {state.status === 'error' && state.message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        disabled={pending || startedAt === 0}
        type="submit"
      >
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? 'Sending…' : 'Get My Free Quote'}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        No spam, ever. We typically respond within 15 minutes.
      </p>
    </form>
  )
}
