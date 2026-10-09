import type { RichTextData } from '@/db/types'

/**
 * Helpers for the blog: reading time, heading extraction for the table of
 * contents, and the slug rule shared with the RichText heading renderer so
 * TOC anchors always match the rendered heading ids.
 */

type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
}

export const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

export const nodePlainText = (node: LexicalNode | undefined): string => {
  const out: string[] = []
  const walk = (n: LexicalNode | undefined): void => {
    if (!n) return
    if (typeof n.text === 'string') out.push(n.text)
    n.children?.forEach(walk)
  }
  walk(node)
  return out.join('').replace(/\s+/g, ' ').trim()
}

export type TocItem = { id: string; text: string; depth: 2 | 3 }

/** h2/h3 headings from a Lexical editor state, for the "On this page" nav. */
export function extractHeadings(content: RichTextData | null | undefined): TocItem[] {
  const root = (content as { root?: LexicalNode } | null | undefined)?.root
  const items: TocItem[] = []
  for (const node of root?.children ?? []) {
    if (node.type === 'heading' && (node.tag === 'h2' || node.tag === 'h3')) {
      const text = nodePlainText(node)
      if (text) items.push({ id: slugifyHeading(text), text, depth: node.tag === 'h2' ? 2 : 3 })
    }
  }
  return items
}

const WORDS_PER_MINUTE = 200

/** Estimated reading time in whole minutes (minimum 1). */
export function readingTime(content: RichTextData | null | undefined): number {
  const root = (content as { root?: LexicalNode } | null | undefined)?.root
  const words = nodePlainText(root).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
