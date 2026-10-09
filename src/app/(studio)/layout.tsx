import type { Metadata } from 'next'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { cn } from '@/utilities/ui'

import '../(frontend)/globals.css'

/**
 * Root layout for the custom admin ("Studio"). Separate <html> from the public
 * site and the Payload panel — this group owns the /studio/* routes only.
 */
export default function StudioRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      data-theme="light"
      lang="en"
      suppressHydrationWarning
    >
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}

export const metadata: Metadata = {
  title: 'Studio · 911 Construction & Electric',
  robots: { index: false, follow: false },
}
