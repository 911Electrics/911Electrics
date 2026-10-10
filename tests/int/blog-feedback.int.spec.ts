import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ph = vi.hoisted(() => ({ __loaded: true, capture: vi.fn() }))
vi.mock('posthog-js', () => ({ default: ph }))

import { BlogFeedback } from '@/components/blog/BlogFeedback'
import { feedbackStorageKey, sanitizeFeedbackComment } from '@/lib/blog-feedback'

const renderIt = () => render(React.createElement(BlogFeedback, { postId: 7, postSlug: 'p7' }))

describe('sanitizeFeedbackComment', () => {
  it('trims, caps at 300 and strips emails/phones', () => {
    expect(sanitizeFeedbackComment('  hi  ')).toBe('hi')
    expect(sanitizeFeedbackComment('x'.repeat(400))).toHaveLength(300)
    expect(sanitizeFeedbackComment('mail me at bob@example.com please')).toBe('mail me at please')
    expect(sanitizeFeedbackComment('call (626) 555-1234 or +1 626.555.1234')).toBe('call or')
    expect(sanitizeFeedbackComment('5551234567')).toBe('')
    expect(sanitizeFeedbackComment('200 amp panel cost in 2026')).toBe('200 amp panel cost in 2026')
  })
  it('uses the agreed storage key', () => {
    expect(feedbackStorageKey(7)).toBe('blog_feedback:7')
  })
})

describe('BlogFeedback', () => {
  beforeEach(() => {
    window.localStorage.clear()
    ph.capture.mockClear()
    ph.__loaded = true
  })
  afterEach(cleanup)

  it('captures a Yes vote once and shows Thanks', () => {
    renderIt()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(ph.capture).toHaveBeenCalledWith('blog_feedback', {
      post_slug: 'p7',
      post_id: 7,
      helpful: true,
    })
    expect(screen.getByText('Thanks!')).toBeTruthy()
    expect(window.localStorage.getItem('blog_feedback:7')).toBe('yes')
  })

  it('No vote shows the comment box and sends a sanitized comment', () => {
    renderIt()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(ph.capture).toHaveBeenCalledWith('blog_feedback', {
      post_slug: 'p7',
      post_id: 7,
      helpful: false,
    })
    const box = screen.getByLabelText(/What were you looking for/)
    fireEvent.change(box, { target: { value: '  rebate amounts, email a@b.co  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(ph.capture).toHaveBeenLastCalledWith('blog_feedback_comment', {
      post_slug: 'p7',
      post_id: 7,
      comment: 'rebate amounts, email',
    })
    expect(screen.getByText('Thanks!')).toBeTruthy()
  })

  it('shows Thanks immediately when this browser already voted', () => {
    window.localStorage.setItem('blog_feedback:7', 'yes')
    renderIt()
    expect(screen.getByText('Thanks!')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
  })

  it('fails silently when PostHog is not loaded', () => {
    ph.__loaded = false
    renderIt()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(ph.capture).not.toHaveBeenCalled()
    expect(screen.getByText('Thanks!')).toBeTruthy()
  })
})
