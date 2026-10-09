import 'server-only'

import { randomBytes } from 'crypto'

import { markdownToLexical } from './markdown-to-lexical'

/** Child-row id, matching the Studio actions (random 24-hex). */
export const genId = (): string => randomBytes(12).toString('hex')

/**
 * Normalise a rich-text field to the stored Lexical JSON string. Accepts either
 * Markdown (a string) or a raw Lexical editor state ({ root: ... }). Returns
 * null for empty/absent input.
 */
export function toLexicalJson(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    if (!value.trim()) return null
    return JSON.stringify(markdownToLexical(value))
  }
  if (typeof value === 'object' && 'root' in (value as Record<string, unknown>)) {
    return JSON.stringify(value)
  }
  return null
}

/** Like toLexicalJson but never null — empty input yields a valid empty document. */
export function toLexicalJsonOrEmpty(value: unknown): string {
  return toLexicalJson(value) ?? JSON.stringify(markdownToLexical(''))
}
