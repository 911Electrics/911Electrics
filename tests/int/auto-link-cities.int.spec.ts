import { describe, expect, it } from 'vitest'

import type { RichTextData, SerializedLexicalNode } from '@/db/types'

import { autoLinkCities, citiesMentionedIn, type LinkableCity } from '@/lib/auto-link-cities'
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
        const text = (children ?? []).map((c) => (c as { text?: string }).text ?? '').join('')
        out.push({ url, text })
      } else if (Array.isArray(children)) {
        walk(children)
      }
    }
  }
  walk(data.root.children as LexNode[])
  return out
}

const city = (cityName: string, pathOverride: string | null = null): LinkableCity => ({
  cityName,
  slug: `electrician-${cityName.toLowerCase().replace(/\s+/g, '-')}-ca`,
  pathOverride,
})

const CITIES: LinkableCity[] = [
  city('Glendale'),
  city('Highland Park'),
  city('Hollywood'),
  city('North Hollywood'),
  city('Pasadena'),
  city('South Pasadena'),
  city('San Fernando'),
  city('San Fernando Valley'),
  city('Beverly Hills'),
  city('Burbank'),
  city('Los Angeles', '/services/los-angeles-ca/'),
]

const url = (name: string) => `https://911electrics.com/${city(name).slug}/`
const link = (md: string, opts?: { title?: string; max?: number }) =>
  collectLinks(autoLinkCities(markdownToLexical(md), CITIES, opts))

describe('autoLinkCities', () => {
  it('links the first mention of a served city to its city page', () => {
    const links = link('Older homes in Highland Park often need work. Highland Park has many.')
    expect(links).toEqual([{ url: url('Highland Park'), text: 'Highland Park' }])
  })

  it('widens the anchor to an adjacent "electrician" phrase', () => {
    expect(link('Call a licensed electrician in Glendale today.')[0]).toEqual({
      url: url('Glendale'),
      text: 'electrician in Glendale',
    })
    expect(link('Most Burbank electricians pull permits.')[0]).toEqual({
      url: url('Burbank'),
      text: 'Burbank electricians',
    })
  })

  it('does not mistake a city for a longer served city that contains it', () => {
    expect(link('We work across South Pasadena every week.')).toEqual([
      { url: url('South Pasadena'), text: 'South Pasadena' },
    ])
    expect(link('Crews cover North Hollywood daily.')).toEqual([
      { url: url('North Hollywood'), text: 'North Hollywood' },
    ])
    expect(link('The San Fernando Valley runs hot in summer.')).toEqual([
      { url: url('San Fernando Valley'), text: 'San Fernando Valley' },
    ])
  })

  it('skips other places, streets, utilities and landmarks', () => {
    expect(link('West Hollywood is its own city.')).toEqual([])
    expect(link('Homes in the Hollywood Hills sit on steep lots.')).toEqual([])
    expect(link('The shop is on Glendale Avenue.')).toEqual([])
    expect(link('Pasadena Water and Power offers a rebate.')).toEqual([])
    expect(link('Fly into Burbank Airport.')).toEqual([])
  })

  it('links the city even when an earlier mention was a utility or street', () => {
    const links = link('Pasadena Water and Power serves all of Pasadena proper.')
    expect(links).toEqual([{ url: url('Pasadena'), text: 'Pasadena' }])
  })

  it('never links Los Angeles (path-override city named in every post)', () => {
    expect(link('Permits in Los Angeles go through LADBS.')).toEqual([])
  })

  it('links the title city first, then others in document order, up to max', () => {
    const md = 'Unlike Glendale and Burbank, most of Highland Park is served by LADWP.'
    const links = link(md, { title: 'Highland Park Electrician in Los Angeles: Panel Upgrades' })
    expect(links.map((l) => l.text).sort()).toEqual(['Glendale', 'Highland Park'])
    expect(link(md, { title: 'Highland Park Electrician', max: 1 })).toEqual([
      { url: url('Highland Park'), text: 'Highland Park' },
    ])
  })

  it('leaves a city the author already linked alone', () => {
    const md = 'See our [Glendale page](/electrician-glendale-ca/). Glendale homes vary.'
    const links = link(md)
    expect(links).toEqual([{ url: '/electrician-glendale-ca/', text: 'Glendale page' }])
  })

  it('skips headings and existing links, and never mutates the input', () => {
    const input = markdownToLexical('## Wiring in Glendale\n\nOld wiring is common in Glendale.')
    const before = JSON.stringify(input)
    const links = collectLinks(autoLinkCities(input, CITIES))
    expect(links).toEqual([{ url: url('Glendale'), text: 'Glendale' }])
    expect(JSON.stringify(input)).toBe(before)
  })

  it('is idempotent — a second pass adds nothing', () => {
    const once = autoLinkCities(markdownToLexical('We serve Glendale and Burbank.'), CITIES)
    expect(collectLinks(autoLinkCities(once, CITIES))).toEqual(collectLinks(once))
  })

  it('composes with the service linker without double-linking', () => {
    const md = 'A panel upgrade in Glendale usually needs a permit.'
    const out = autoLinkCities(autoLinkServices(markdownToLexical(md)), CITIES)
    expect(collectLinks(out).map((l) => l.text)).toEqual(['panel upgrade', 'Glendale'])
  })
})

describe('citiesMentionedIn', () => {
  it('finds targeted cities in a title, in order, ignoring Los Angeles', () => {
    const found = citiesMentionedIn('Pasadena vs Glendale: Panel Upgrades in Los Angeles', CITIES)
    expect(found.map((c) => c.cityName)).toEqual(['Pasadena', 'Glendale'])
  })

  it('does not report Pasadena for a South Pasadena title', () => {
    const found = citiesMentionedIn('South Pasadena Electrician Guide', CITIES)
    expect(found.map((c) => c.cityName)).toEqual(['South Pasadena'])
  })
})

describe('autoLinkServices — author links win', () => {
  it('does not add a second link to a service page the author already linked', () => {
    const md =
      'Read about [upgrading your panel](https://911electrics.com/electrical-panel-upgrades-los-angeles-ca/). A panel upgrade takes a day.'
    const links = collectLinks(autoLinkServices(markdownToLexical(md)))
    expect(links).toHaveLength(1)
    expect(links[0].text).toBe('upgrading your panel')
  })
})
