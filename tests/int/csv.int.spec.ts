import { describe, expect, it } from 'vitest'

import { csvCell, toCsv } from '@/lib/csv'

describe('csvCell', () => {
  it('passes simple values through', () => {
    expect(csvCell('hello')).toBe('hello')
    expect(csvCell(42)).toBe('42')
  })

  it('renders null/undefined as empty', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('quotes values with commas, quotes or newlines and doubles inner quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""')
  })
})

describe('toCsv', () => {
  it('joins header and escaped rows', () => {
    const out = toCsv(['name', 'note'], [['Ann', 'ok'], ['Bob', 'a,b']])
    expect(out).toBe('name,note\nAnn,ok\nBob,"a,b"')
  })
})
