import type { Metadata } from 'next'

import React from 'react'

import { BlogArchive } from '@/components/BlogArchive'

export const revalidate = 86400

export default async function BlogIndexPage() {
  return <BlogArchive page={1} />
}

export const metadata: Metadata = {
  title: 'Electrical Tips & Guides | 911 Construction & Electric Inc.',
  description:
    'Expert electrical advice for Los Angeles homeowners and businesses: EV charger installation, panel upgrades, rebates, safety inspections and more.',
  alternates: { canonical: '/blog/' },
}
