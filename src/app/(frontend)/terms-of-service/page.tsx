import type { Metadata } from 'next'

import React from 'react'

import { getSiteSettings } from '@/lib/queries'

export default async function TermsOfServicePage() {
  const siteSettings = await getSiteSettings()
  const { address } = siteSettings

  return (
    <>
      <header className="bg-navy-950 py-14 text-white">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold md:text-5xl">Terms of Service</h1>
          <p className="mt-3 text-white/70">Last updated: June 17, 2026</p>
        </div>
      </header>
      <article className="prose prose-slate container max-w-3xl py-14">
        <p>
          These terms govern your use of the {siteSettings.businessName} website. By using this
          site you agree to them. If you do not agree, please do not use the site.
        </p>

        <h2>Use of this website</h2>
        <p>
          The content on this site is provided for general information about our electrical and
          construction services. You may browse and contact us through the site for lawful
          purposes only. You agree not to misuse the site, attempt to disrupt it, or submit false
          or fraudulent information through our forms.
        </p>

        <h2>Quotes and estimates</h2>
        <p>
          Any prices, estimates, or response times shown on this site or provided through our quote
          forms are preliminary and for informational purposes. A binding quote is provided only
          after we assess the specific work, and all services are subject to a separate written
          agreement. Nothing on this website constitutes a contract for services.
        </p>

        <h2>Licensing</h2>
        <p>
          {siteSettings.businessName} is a licensed California contractor (License #
          {siteSettings.licenseNumber}). All work is performed in accordance with applicable
          California licensing requirements and electrical codes.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The text, images, logos, and design on this site are the property of{' '}
          {siteSettings.businessName} or its licensors and may not be copied or reused without
          permission.
        </p>

        <h2>Disclaimer and limitation of liability</h2>
        <p>
          This website is provided &quot;as is&quot; without warranties of any kind. We are not
          liable for any damages arising from your use of, or inability to use, this website. This
          does not limit any rights you have under the separate agreement for services we perform
          for you, or any rights that cannot be limited under California law.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after changes are
          posted means you accept the updated terms.
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
  title: 'Terms of Service | 911 Construction & Electric Inc.',
  description:
    'The terms that govern use of the 911 Construction & Electric Inc. website.',
  alternates: { canonical: '/terms-of-service/' },
}
