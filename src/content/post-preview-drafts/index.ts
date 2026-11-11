import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { markdownToLexical } from '@/lib/markdown-to-lexical'
import type { PostDetail } from '@/lib/posts'

/**
 * PREVIEW ONLY. Replaces the body of one blog post on Vercel preview
 * deployments (VERCEL_ENV === 'preview'). Production is unchanged.
 *
 * Authorized 2026-11-10: Haik approved a private preview of
 * /electrical-panel-upgrade-cost-los-angeles/ with existing price ranges
 * kept as-is. Title, meta, slug, hero, dates, footer and the Google badge
 * are not overridden. Do not set this to run in production.
 */
const PREVIEW_SLUG = 'electrical-panel-upgrade-cost-los-angeles'

export function applyPostPreviewDraft(post: PostDetail | null): PostDetail | null {
  if (!post) return post
  if (process.env.VERCEL_ENV !== 'preview') return post
  if (post.slug !== PREVIEW_SLUG) return post

  const md = readFileSync(
    join(process.cwd(), 'src/content/post-preview-drafts', `${PREVIEW_SLUG}.md`),
    'utf8',
  )
  return { ...post, content: markdownToLexical(md) }
}
