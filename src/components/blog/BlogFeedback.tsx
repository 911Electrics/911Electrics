'use client'

import posthog from 'posthog-js'
import React, { useId, useState, useSyncExternalStore } from 'react'

import {
  FEEDBACK_COMMENT_EVENT,
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_EVENT,
  feedbackStorageKey,
  sanitizeFeedbackComment,
} from '@/lib/blog-feedback'

type Stage = 'ask' | 'comment' | 'thanks'

/** Best-effort capture: silently does nothing if PostHog is missing or blocked. */
function capture(event: string, props: Record<string, unknown>) {
  try {
    if (posthog && (posthog as { __loaded?: boolean }).__loaded) posthog.capture(event, props)
  } catch {
    // analytics must never break the page
  }
}

const noopSubscribe = () => () => {}

function readVoted(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

function writeVote(key: string, helpful: boolean) {
  try {
    window.localStorage.setItem(key, helpful ? 'yes' : 'no')
  } catch {
    // storage blocked (private mode etc.) — vote still counts once per page view
  }
}

/** One-line "Was this helpful?" Yes/No feedback at the end of a blog post. */
export function BlogFeedback({ postId, postSlug }: { postId: number; postSlug: string }) {
  const [picked, setStage] = useState<Stage>('ask')
  const [comment, setComment] = useState('')
  const textareaId = useId()
  const key = feedbackStorageKey(postId)

  // Server render and hydration assume "not voted" (same markup, same height);
  // the client then swaps in "Thanks!" in place if this browser already voted.
  const alreadyVoted = useSyncExternalStore(
    noopSubscribe,
    () => readVoted(key),
    () => false,
  )
  const stage: Stage = picked === 'ask' && alreadyVoted ? 'thanks' : picked

  const vote = (helpful: boolean) => {
    if (readVoted(key)) {
      setStage('thanks')
      return
    }
    writeVote(key, helpful)
    capture(FEEDBACK_EVENT, { post_slug: postSlug, post_id: postId, helpful })
    setStage(helpful ? 'thanks' : 'comment')
  }

  const sendComment = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = sanitizeFeedbackComment(comment)
    if (clean)
      capture(FEEDBACK_COMMENT_EVENT, { post_slug: postSlug, post_id: postId, comment: clean })
    setStage('thanks')
  }

  const btn =
    'inline-flex h-8 min-w-14 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-navy-900 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

  return (
    <section
      aria-label="Article feedback"
      className="mt-10 border-t border-border pt-6"
      data-blog-feedback=""
    >
      <div aria-live="polite" className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
        {stage === 'thanks' ? (
          <p className="text-sm font-semibold text-navy-950">Thanks!</p>
        ) : stage === 'ask' ? (
          <>
            <p className="text-sm font-semibold text-navy-950" id={`${textareaId}-q`}>
              Was this helpful?
            </p>
            <div aria-labelledby={`${textareaId}-q`} className="flex gap-2" role="group">
              <button className={btn} onClick={() => vote(true)} type="button">
                Yes
              </button>
              <button className={btn} onClick={() => vote(false)} type="button">
                No
              </button>
            </div>
          </>
        ) : (
          <form className="w-full max-w-xl space-y-2" onSubmit={sendComment}>
            <label className="block text-sm font-semibold text-navy-950" htmlFor={textareaId}>
              Thanks! What were you looking for?{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="block w-full rounded-lg border border-border bg-white p-3 text-base text-navy-950 md:text-sm focus-visible:outline-2 focus-visible:outline-brand-600"
              id={textareaId}
              maxLength={FEEDBACK_COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Please don't include your name, email or phone number."
              rows={3}
              value={comment}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {comment.length}/{FEEDBACK_COMMENT_MAX}
              </span>
              <button className={btn} type="submit">
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
