import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Licensed electrician serving Los Angeles and surrounding areas. Electrical repairs, panel upgrades, EV charger installation and 24/7 emergency service.',
  images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  siteName: '911 Construction & Electric Inc.',
  title: '911 Construction & Electric Inc.',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
