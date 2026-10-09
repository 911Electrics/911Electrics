import Link from 'next/link'

import { createTestimonial } from '@/app/actions/studio-testimonials'

import { TestimonialForm } from '../TestimonialForm'

export const dynamic = 'force-dynamic'

export default function NewTestimonialPage() {
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        href="/studio/testimonials"
      >
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to reviews
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New review</h1>
      </header>
      <TestimonialForm action={createTestimonial} submitLabel="Create review" />
    </div>
  )
}
