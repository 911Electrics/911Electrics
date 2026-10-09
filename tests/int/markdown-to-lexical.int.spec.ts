import { describe, expect, it } from 'vitest'

import type { SerializedLexicalNode } from '@/db/types'

import { markdownToLexical, parseInline } from '@/lib/markdown-to-lexical'

const IS_BOLD = 1
const IS_ITALIC = 2
const IS_CODE = 16

const children = (md: string): SerializedLexicalNode[] =>
  (markdownToLexical(md).root.children ?? []) as SerializedLexicalNode[]

describe('parseInline', () => {
  it('returns a plain text node for unformatted text', () => {
    const nodes = parseInline('hello world')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ type: 'text', text: 'hello world', format: 0 })
  })

  it('marks bold, italic and code with the right format bitmask', () => {
    expect(parseInline('**b**')[0]).toMatchObject({ text: 'b', format: IS_BOLD })
    expect(parseInline('*i*')[0]).toMatchObject({ text: 'i', format: IS_ITALIC })
    expect(parseInline('`c`')[0]).toMatchObject({ text: 'c', format: IS_CODE })
  })

  it('combines nested emphasis into one bitmask', () => {
    const nodes = parseInline('***x***')
    expect(nodes[0]).toMatchObject({ text: 'x', format: IS_BOLD | IS_ITALIC })
  })

  it('builds a link node with url and child text', () => {
    const nodes = parseInline('see [our site](https://911electrics.com)')
    const linkNode = nodes.find((n) => n.type === 'link')!
    expect(linkNode).toBeTruthy()
    expect((linkNode.fields as { url: string }).url).toBe('https://911electrics.com')
    expect((linkNode.children as SerializedLexicalNode[])[0]).toMatchObject({ text: 'our site' })
  })
})

describe('markdownToLexical', () => {
  it('wraps output in a root node', () => {
    const data = markdownToLexical('hi')
    expect(data.root.type).toBe('root')
    expect(Array.isArray(data.root.children)).toBe(true)
  })

  it('converts headings to heading nodes with the matching tag', () => {
    const [h2] = children('## Section title')
    expect(h2).toMatchObject({ type: 'heading', tag: 'h2' })
    expect((h2.children as SerializedLexicalNode[])[0]).toMatchObject({ text: 'Section title' })
  })

  it('creates separate paragraphs across blank lines', () => {
    const nodes = children('First para.\n\nSecond para.')
    const paras = nodes.filter((n) => n.type === 'paragraph')
    expect(paras).toHaveLength(2)
  })

  it('builds an unordered list with list items', () => {
    const [listNode] = children('- one\n- two\n- three')
    expect(listNode).toMatchObject({ type: 'list', tag: 'ul', listType: 'bullet' })
    expect(listNode.children).toHaveLength(3)
    expect((listNode.children as SerializedLexicalNode[])[0].type).toBe('listitem')
  })

  it('builds an ordered list', () => {
    const [listNode] = children('1. first\n2. second')
    expect(listNode).toMatchObject({ type: 'list', tag: 'ol', listType: 'number' })
    expect(listNode.children).toHaveLength(2)
  })

  it('converts blockquotes', () => {
    const [q] = children('> a wise quote')
    expect(q.type).toBe('quote')
  })

  it('drops horizontal rules without emitting a node', () => {
    const nodes = children('para\n\n---\n\nmore')
    expect(nodes.every((n) => n.type !== 'thematic-break')).toBe(true)
    expect(nodes.filter((n) => n.type === 'paragraph')).toHaveLength(2)
  })

  it('always yields at least one node for empty input', () => {
    expect(children('').length).toBeGreaterThanOrEqual(1)
  })

  it('produces a structure the renderer understands (text under paragraph)', () => {
    const [p] = children('Call us at **747-255-8595** today.')
    expect(p.type).toBe('paragraph')
    const kids = p.children as SerializedLexicalNode[]
    expect(kids.some((k) => k.format === IS_BOLD && k.text === '747-255-8595')).toBe(true)
  })
})
