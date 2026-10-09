import { describe, expect, it } from 'vitest'

import type { RichTextData, SerializedLexicalNode } from '@/db/types'

import { autoLinkServices } from '@/lib/auto-link-services'
import { markdownToLexical } from '@/lib/markdown-to-lexical'

type LexNode = SerializedLexicalNode

/** Collect every link node as {url, text} in document order. */
function collectLinks(data: RichTextData): { url: string; text: string }[] {
  const out: { url: string; text: string }[] = []
  const walk = (nodes: LexNode[]) => {
    for (const n of nodes) {
      const type = (n as { type?: string }).type
      const children = (n as { children?: LexNode[] }).children
      if (type === 'link') {
        const url = (n as { fields?: { url?: string } }).fields?.url ?? ''
        const text = (children ?? [])
          .map((c) => (c as { text?: string }).text ?? '')
          .join('')
        out.push({ url, text })
      } else if (Array.isArray(children)) {
        walk(children)
      }
    }
  }
  walk(data.root.children as LexNode[])
  return out
}

const PANEL = 'https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/'
const EV = 'https://911electrics.com/ev-charger-installation-los-angeles-ca/'
const REPAIRS = 'https://911electrics.com/electrical-repairs-los-angeles-ca/'

describe('autoLinkServices', () => {
  it('links the first mention of each service topic to its page', () => {
    const md = 'A panel upgrade is often needed before an EV charger can be installed safely.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md)))
    // Links are returned in document order: "panel upgrade" precedes "EV charger".
    expect(links).toEqual([
      { url: PANEL, text: 'panel upgrade' },
      { url: EV, text: 'EV charger' },
    ])
  })

  it('links only the FIRST occurrence of a given topic', () => {
    const md = 'A panel upgrade matters. Another panel upgrade later does not get a second link.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md)))
    expect(links.filter((l) => l.url === PANEL)).toHaveLength(1)
  })

  it('never links text that is already inside a link', () => {
    const md = 'See our [panel upgrade guide](https://example.com/guide) for details.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md)))
    // The only link is the author's own; no service link injected inside it.
    expect(links).toEqual([{ url: 'https://example.com/guide', text: 'panel upgrade guide' }])
  })

  it('skips headings', () => {
    const md = '# Panel Upgrade Basics\n\nWe also do rewiring on older homes.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md)))
    // Heading "Panel Upgrade" is not linked; the body "rewiring" is.
    expect(links).toEqual([{ url: REPAIRS, text: 'rewiring' }])
  })

  it('respects the max cap', () => {
    const md =
      'panel upgrade, EV charger, rewiring, emergency electrician, recessed lighting, new construction electrical.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md), 2))
    expect(links).toHaveLength(2)
  })

  it('does not mutate the input', () => {
    const input = markdownToLexical('A panel upgrade today.')
    const snapshot = JSON.stringify(input)
    autoLinkServices(input)
    expect(JSON.stringify(input)).toEqual(snapshot)
  })

  it('preserves surrounding text when splitting a node', () => {
    const out = autoLinkServices(markdownToLexical('Get a panel upgrade now.'))
    const text = (out.root.children as LexNode[])
      .flatMap((p) => ((p as { children?: LexNode[] }).children ?? []))
      .flatMap((c) => {
        const type = (c as { type?: string }).type
        if (type === 'link') {
          return ((c as { children?: LexNode[] }).children ?? []).map(
            (x) => (x as { text?: string }).text ?? '',
          )
        }
        return [(c as { text?: string }).text ?? '']
      })
      .join('')
    expect(text).toBe('Get a panel upgrade now.')
  })
})
