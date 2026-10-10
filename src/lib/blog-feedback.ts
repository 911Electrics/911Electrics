/**
 * Helpers for the "Was this helpful?" line at the end of blog posts.
 * Pure functions so they can be unit-tested without a browser.
 */

export const FEEDBACK_EVENT = 'blog_feedback'
export const FEEDBACK_COMMENT_EVENT = 'blog_feedback_comment'
export const FEEDBACK_COMMENT_MAX = 300

/** localStorage key used to allow one vote per browser per post. */
export const feedbackStorageKey = (postId: number | string) => `blog_feedback:${postId}`

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g
// US-style phone numbers: 555-123-4567, (555) 123 4567, +1 555.123.4567, 5551234567
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g

/**
 * Trim, cap at 300 chars and drop anything that looks like an email address or
 * phone number so no personal data reaches analytics. Returns '' when nothing
 * useful is left.
 */
export function sanitizeFeedbackComment(input: string): string {
  return input
    .slice(0, FEEDBACK_COMMENT_MAX)
    .replace(EMAIL_RE, ' ')
    .replace(PHONE_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
