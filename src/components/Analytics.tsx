'use client'

import Script from 'next/script'
import React, { useEffect } from 'react'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

/**
 * GA4 loader (only when NEXT_PUBLIC_GA_ID is set) + lead-gen event
 * delegation: every tel: link click fires `phone_call_click` — the key
 * conversion signal for a 24/7 trade business.
 */
export function Analytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href^="tel:"]')
      if (link) {
        window.gtag?.('event', 'phone_call_click', {
          link_location: window.location.pathname,
        })
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (!GA_ID) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  )
}
