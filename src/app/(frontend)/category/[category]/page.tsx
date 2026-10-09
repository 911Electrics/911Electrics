import type { Metadata } from 'next'

import React from 'react'

import { CategoryArchive } from '@/components/CategoryArchive'
import { getCategoriesWithCounts } from '@/lib/posts'

export const revalidate = 86400

type Args = {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  const categories = await getCategoriesWithCounts()
  return categories.filter((c) => c.count > 0 && c.slug).map((c) => ({ category: c.slug }))
}

export default async function CategoryPage({ params }: Args) {
  const { category } = await params
  return <CategoryArchive categorySlug={category} page={1} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { category } = await params
  const title = category
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
  return {
    title: `${title} | 911 Construction & Electric Inc.`,
    description: `${title} from 911 Construction & Electric — practical electrical advice and guides for Los Angeles homeowners and businesses, from licensed electricians.`,
    alternates: { canonical: `/category/${category}/` },
  }
}
