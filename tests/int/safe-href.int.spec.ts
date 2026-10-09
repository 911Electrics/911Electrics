import { describe, expect, it } from 'vitest'

import { safeHref } from '@/utilities/safeHref'

describe('safeHref', () => {
  it('passes ordinary web, mail, phone and relative links through', () => {
    for (const url of [
      'https://911electrics.com/electrician-pasadena-ca/',
      'http://example.com',
      'mailto:info@911electrics.com',
      'tel:+17472558595',
      '/contact/',
      '#faq',
      '?page=2',
      '//cdn.example.com/x.png',
      'electrician-glendale-ca/',
    ]) {
      expect(safeHref(url)).toBe(url)
    }
  })

  it('trims surrounding whitespace', () => {
    expect(safeHref('  /contact/  ')).toBe('/contact/')
  })

  it('rejects script-capable and local schemes', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'blob:https://911electrics.com/x',
    ]) {
      expect(safeHref(url)).toBeNull()
    }
  })

  it('rejects a scheme obfuscated with control characters or whitespace', () => {
    expect(safeHref('java\tscript:alert(1)')).toBeNull()
    expect(safeHref('java\nscript:alert(1)')).toBeNull()
    expect(safeHref(' \u0001javascript:alert(1)')).toBeNull()
  })

  it('rejects empty and non-string values', () => {
    expect(safeHref('')).toBeNull()
    expect(safeHref('   ')).toBeNull()
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref({ url: 'x' })).toBeNull()
  })

  it('does not mistake a colon later in a relative URL for a scheme', () => {
    expect(safeHref('/blog/?q=a:b')).toBe('/blog/?q=a:b')
  })
})
