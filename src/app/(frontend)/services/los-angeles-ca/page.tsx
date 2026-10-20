import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { getCityByPath } from '@/lib/cities'
import {
  getCityPageTemplate,
  getFeaturedTestimonials,
  getServicesNav,
  getSiteSettings,
} from '@/lib/queries'
import { CityPage } from '@/templates/CityPage'
import { buildMeta } from '@/utilities/buildMeta'

/**
 * The one city page that doesn't live at root: /services/los-angeles-ca/
 * (preserved verbatim from the WordPress URL structure). The city doc carries
 * pathOverride = '/services/los-angeles-ca/'.
 */
const PATH = '/services/los-angeles-ca/'

export const revalidate = 3600

export default async function LosAngelesCityPage() {
  const city = await getCityByPath(PATH)
  if (!city) notFound()

  const [template, services, siteSettings, testimonials] = await Promise.all([
    getCityPageTemplate(),
    getServicesNav(),
    getSiteSettings(),
    getFeaturedTestimonials(),
  ])

  return (
    <CityPage
      city={city}
      services={services}
      siteSettings={siteSettings}
      template={template}
      testimonials={testimonials}
    />
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const city = await getCityByPath(PATH)
  if (!city) return {}
  return buildMeta({ ...city.meta, path: PATH, fallbackTitle: `Electrician in ${city.cityName}, CA` })
}
