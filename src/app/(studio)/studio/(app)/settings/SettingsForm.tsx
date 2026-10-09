'use client'

import { useActionState, useState } from 'react'

import { updateSettings } from '@/app/actions/studio-settings'
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABEL, type SocialPlatform } from '@/studio/constants'
import type { StudioSettings } from '@/studio/settings'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={name}>
        {label}
        {!required && <span className="text-slate-400"> (optional)</span>}
      </label>
      <input
        className={inputCls}
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

export function SettingsForm({ initial }: { initial: StudioSettings }) {
  const [state, formAction, pending] = useActionState(updateSettings, {})
  const [socials, setSocials] = useState<{ platform: SocialPlatform; url: string }[]>(
    initial.socials.length ? initial.socials : [],
  )

  const updateSocial = (i: number, patch: Partial<{ platform: SocialPlatform; url: string }>) =>
    setSocials((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Saved. Changes are live on the website.
        </div>
      )}

      <Section title="Business">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field defaultValue={initial.businessName} label="Business name" name="businessName" required />
          <Field defaultValue={initial.licenseNumber} label="License number" name="licenseNumber" />
          <Field defaultValue={initial.phone} label="Phone" name="phone" required />
          <Field defaultValue={initial.email} label="Email" name="email" type="email" required />
          <Field defaultValue={initial.hoursLabel} label="Hours label" name="hoursLabel" placeholder="24/7 Emergency Service" />
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field defaultValue={initial.addressStreet} label="Street" name="addressStreet" />
          <Field defaultValue={initial.addressCity} label="City" name="addressCity" />
          <Field defaultValue={initial.addressState} label="State" name="addressState" />
          <Field defaultValue={initial.addressZip} label="ZIP" name="addressZip" />
        </div>
      </Section>

      <Section title="Map & rating">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field defaultValue={initial.geoLat} label="Latitude" name="geoLat" placeholder="34.1453" />
          <Field defaultValue={initial.geoLng} label="Longitude" name="geoLng" placeholder="-118.1182" />
          <Field defaultValue={initial.ratingValue} label="Rating value" name="ratingValue" placeholder="5" />
          <Field defaultValue={initial.ratingCount} label="Rating count" name="ratingCount" placeholder="120" />
        </div>
      </Section>

      <Section title="Social links">
        <input name="socials" type="hidden" value={JSON.stringify(socials.filter((s) => s.url.trim()))} />
        <div className="space-y-3">
          {socials.length === 0 && (
            <p className="text-sm text-slate-400">No social links yet.</p>
          )}
          {socials.map((s, i) => (
            <div className="flex gap-2" key={i}>
              <select
                className={`${inputCls} max-w-[10rem]`}
                onChange={(e) => updateSocial(i, { platform: e.target.value as SocialPlatform })}
                value={s.platform}
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_PLATFORM_LABEL[p]}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                onChange={(e) => updateSocial(i, { url: e.target.value })}
                placeholder="https://…"
                type="url"
                value={s.url}
              />
              <button
                className="shrink-0 rounded-lg px-3 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                onClick={() => setSocials((prev) => prev.filter((_, idx) => idx !== i))}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50"
          onClick={() => setSocials((prev) => [...prev, { platform: 'facebook', url: '' }])}
          type="button"
        >
          + Add link
        </button>
      </Section>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
