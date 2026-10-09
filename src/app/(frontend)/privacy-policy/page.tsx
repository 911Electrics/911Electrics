import type { Metadata } from 'next'

import React from 'react'

import { getSiteSettings } from '@/lib/queries'

export default async function PrivacyPolicyPage() {
  const siteSettings = await getSiteSettings()
  const { address } = siteSettings

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-white/70">Last updated: June 10, 2026</p>
        </div>
      </header>
      <article className="prose prose-slate container max-w-3xl py-14">
        <p>
          {siteSettings.businessName} (&quot;we&quot;, &quot;us&quot;) respects your privacy. This
          policy explains what information we collect through this website and how we use it.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Quote and contact forms:</strong> name, phone number, email address, service
            address, and the details of your request. We collect this only when you submit a form.
          </li>
          <li>
            <strong>Technical data:</strong> standard server logs (IP address, browser type) and,
            if analytics are enabled, anonymous usage statistics such as pages visited.
          </li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To respond to your service requests and provide estimates.</li>
          <li>To schedule and perform electrical work you hire us for.</li>
          <li>To improve our website and services.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information, and we do not share it with
          third parties except service providers that help us operate this website (such as
          hosting and email delivery) or where required by law.
        </p>

        <h2>Cookies</h2>
        <p>
          This website uses only essential cookies required for the site to function (for example,
          to keep the site secure and remember basic preferences). We do not use advertising or
          cross-site tracking cookies. If we add analytics or marketing tools in the future that
          set non-essential cookies, we will update this policy and request your consent where the
          law requires it. You can block or delete cookies in your browser settings at any time.
        </p>

        <h2>Data retention</h2>
        <p>
          Form submissions are kept for as long as needed to serve you and for our business
          records. You may request deletion of your information at any time.
        </p>

        <h2>Your choices</h2>
        <p>
          California residents have rights under the CCPA, including the right to know what
          personal information we hold about you and to request its deletion. To exercise these
          rights, contact us using the details below.
        </p>

        <h2>Contact</h2>
        <p>
          {siteSettings.businessName}
          <br />
          {address?.street}, {address?.city}, {address?.state} {address?.zip}
          <br />
          Phone: {siteSettings.phone}
          <br />
          Email: {siteSettings.email}
        </p>
      </article>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Privacy Policy | 911 Construction & Electric Inc.',
  description:
    'How 911 Construction & Electric Inc. collects, uses, and protects your personal information.',
  alternates: { canonical: '/privacy-policy/' },
}
