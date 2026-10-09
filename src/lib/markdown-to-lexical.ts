import type { RichTextData, SerializedLexicalNode } from '@/db/types'

/**
 * Convert Markdown to the Lexical editor-state JSON this site stores for blog
 * post bodies (the same shape the Studio editor produces and @/components/
 * RichText renders). Built for the blog API so callers can POST plain Markdown
 * instead of hand-authoring Lexical nodes.
 *
 * Supported: headings (#–######), paragraphs, unordered/ordered lists,
 * blockquotes, horizontal rules (dropped), and inline bold/italic/code/links.
 * Anything unrecognised falls through as plain paragraph text, so content is
 * never lost.
 */

type LexNode = SerializedLexicalNode

// Lexical text-format bitmask flags (mirror @/components/RichText).
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_CODE = 16

const textNode = (text: string, format = 0): LexNode => ({
  mode: 'normal',
  text,
  type: 'text',
  style: '',
  detail: 0,
  format,
  version: 1,
})

const lineBreak = (): LexNode => ({ type: 'linebreak', version: 1 })

const paragraph = (children: LexNode[]): LexNode => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  children,
  direction: null,
  textStyle: '',
  textFormat: 0,
})

const heading = (tag: string, children: LexNode[]): LexNode => ({
  tag,
  type: 'heading',
  format: '',
  indent: 0,
  version: 1,
  children,
  direction: null,
})

const listItem = (value: number, children: LexNode[]): LexNode => ({
  type: 'listitem',
  value,
  format: '',
  indent: 0,
  version: 1,
  children,
  direction: null,
})

const list = (ordered: boolean, items: LexNode[]): LexNode => ({
  tag: ordered ? 'ol' : 'ul',
  type: 'list',
  start: 1,
  format: '',
  indent: 0,
  version: 1,
  children: items,
  listType: ordered ? 'number' : 'bullet',
  direction: null,
})

const quote = (children: LexNode[]): LexNode => ({
  type: 'quote',
  format: '',
  indent: 0,
  version: 1,
  children,
  direction: null,
})

const link = (url: string, children: LexNode[]): LexNode => ({
  type: 'link',
  fields: { url, newTab: false, linkType: 'custom' },
  format: '',
  indent: 0,
  version: 2,
  children,
  direction: null,
})

/**
 * Parse inline Markdown (bold/italic/code/links) into text + link nodes.
 * `baseFormat` carries the active format bitmask through nested emphasis.
 */
export function parseInline(input: string, baseFormat = 0): LexNode[] {
  const out: LexNode[] = []
  let buffer = ''
  let i = 0

  const flush = () => {
    if (buffer) {
      out.push(textNode(buffer, baseFormat))
      buffer = ''
    }
  }

  while (i < input.length) {
    const rest = input.slice(i)

    // [label](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest)
    if (linkMatch) {
      flush()
      out.push(link(linkMatch[2], parseInline(linkMatch[1], baseFormat)))
      i += linkMatch[0].length
      continue
    }

    // ***bold italic*** or ___bold italic___ (check before the double form)
    const boldItalicMatch = /^\*\*\*([\s\S]+?)\*\*\*/.exec(rest) || /^___([\s\S]+?)___/.exec(rest)
    if (boldItalicMatch) {
      flush()
      out.push(...parseInline(boldItalicMatch[1], baseFormat | IS_BOLD | IS_ITALIC))
      i += boldItalicMatch[0].length
      continue
    }

    // **bold** or __bold__
    const boldMatch = /^\*\*([\s\S]+?)\*\*/.exec(rest) || /^__([\s\S]+?)__/.exec(rest)
    if (boldMatch) {
      flush()
      out.push(...parseInline(boldMatch[1], baseFormat | IS_BOLD))
      i += boldMatch[0].length
      continue
    }

    // *italic* or _italic_
    const italicMatch = /^\*([\s\S]+?)\*/.exec(rest) || /^_([\s\S]+?)_/.exec(rest)
    if (italicMatch) {
      flush()
      out.push(...parseInline(italicMatch[1], baseFormat | IS_ITALIC))
      i += italicMatch[0].length
      continue
    }

    // `code`
    const codeMatch = /^`([^`]+?)`/.exec(rest)
    if (codeMatch) {
      flush()
      out.push(textNode(codeMatch[1], baseFormat | IS_CODE))
      i += codeMatch[0].length
      continue
    }

    buffer += input[i]
    i += 1
  }

  flush()
  return out
}

export function markdownToLexical(md: string): RichTextData {
  const children: LexNode[] = []
  const lines = (md ?? '').replace(/\r\n?/g, '\n').split('\n')
  let i = 0
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      const text = para.join(' ').trim()
      if (text) children.push(paragraph(parseInline(text)))
      para = []
    }
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (!trimmed) {
      flushPara()
      i += 1
      continue
    }

    // Heading: #–######
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (h) {
      flushPara()
      children.push(heading(`h${h[1].length}`, parseInline(h[2].trim())))
      i += 1
      continue
    }

    // Horizontal rule — no renderer node, drop it.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara()
      i += 1
      continue
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      flushPara()
      const qlines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        qlines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      const inline: LexNode[] = []
      qlines.forEach((q, idx) => {
        if (idx > 0) inline.push(lineBreak())
        inline.push(...parseInline(q))
      })
      children.push(quote(inline))
      continue
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      flushPara()
      const items: LexNode[] = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*+]\s+/, '')
        items.push(listItem(items.length + 1, parseInline(itemText)))
        i += 1
      }
      children.push(list(false, items))
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara()
      const items: LexNode[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '')
        items.push(listItem(items.length + 1, parseInline(itemText)))
        i += 1
      }
      children.push(list(true, items))
      continue
    }

    // Plain paragraph line — accumulate until a blank/special line.
    para.push(trimmed)
    i += 1
  }

  flushPara()
  if (children.length === 0) children.push(paragraph([textNode('')]))

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: null,
    },
  }
}
