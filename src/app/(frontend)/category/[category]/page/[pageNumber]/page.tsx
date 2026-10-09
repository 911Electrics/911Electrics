import type { Metadata } from 'next'

import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { CategoryArchive } from '@/components/CategoryArchive'

export const revalidate = 86400

type Args = {
  params: Promise<{ category: string; pageNumber: string }>
}

export default async function CategoryPaginatedPage({ params }: Args) {
  const { category, pageNumber } = await params
  const page = Number(pageNumber)
  if (!Number.isInteger(page) || page < 1) notFound()
  if (page === 1) redirect(`/category/${category}/`)
  return <CategoryArchive categorySlug={category} page={page} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { category, pageNumber } = await params
  const title = category
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
  return {
    title: `${title} — Page ${pageNumber} | 911 Construction & Electric Inc.`,
    description: `${title} — more electrical guides from 911 Construction & Electric, licensed Los Angeles electricians. Page ${pageNumber}.`,
    alternates: { canonical: `/category/${category}/page/${pageNumber}/` },
  }
}
