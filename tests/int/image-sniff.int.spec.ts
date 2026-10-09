import { describe, expect, it } from 'vitest'

import { sniffImageType, withImageExtension } from '@/lib/image-sniff'

const bytes = (...parts: (number[] | string)[]): Uint8Array =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

const pad = (n: number) => new Array(n).fill(0)

describe('sniffImageType', () => {
  it('recognises each accepted format from its magic bytes', () => {
    expect(sniffImageType(bytes([0xff, 0xd8, 0xff, 0xe0], pad(12)))).toBe('image/jpeg')
    expect(sniffImageType(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], pad(8)))).toBe('image/png')
    expect(sniffImageType(bytes('GIF89a', pad(10)))).toBe('image/gif')
    expect(sniffImageType(bytes('GIF87a', pad(10)))).toBe('image/gif')
    expect(sniffImageType(bytes('RIFF', [0x24, 0, 0, 0], 'WEBP', 'VP8 '))).toBe('image/webp')
  })

  it('recognises AVIF by major brand or by a compatible brand', () => {
    const major = bytes([0, 0, 0, 0x1c], 'ftyp', 'avif', [0, 0, 0, 0], 'mif1', 'miaf')
    expect(sniffImageType(major)).toBe('image/avif')
    const compatible = bytes([0, 0, 0, 0x1c], 'ftyp', 'mif1', [0, 0, 0, 0], 'miaf', 'avif')
    expect(sniffImageType(compatible)).toBe('image/avif')
  })

  it('does not mistake other ISO-BMFF files (HEIC, MP4) for AVIF', () => {
    expect(sniffImageType(bytes([0, 0, 0, 0x18], 'ftyp', 'heic', [0, 0, 0, 0], 'mif1', 'heic'))).toBeNull()
    expect(sniffImageType(bytes([0, 0, 0, 0x18], 'ftyp', 'isom', [0, 0, 2, 0], 'isom', 'mp41'))).toBeNull()
    // "avif" appearing in the minor-version slot or past the ftyp box is not a brand.
    expect(sniffImageType(bytes([0, 0, 0, 0x10], 'ftyp', 'isom', 'avif', 'avif'))).toBeNull()
  })

  it('refuses SVG, HTML and scripts whatever they are called', () => {
    for (const text of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<?xml version="1.0"?><svg></svg>',
      '<!doctype html><html><script>alert(1)</script></html>',
      'GIF89 not really',
      '#!/bin/sh\nrm -rf /',
    ]) {
      expect(sniffImageType(bytes(text))).toBeNull()
    }
  })

  it('refuses a RIFF container that is not WebP', () => {
    expect(sniffImageType(bytes('RIFF', [0x24, 0, 0, 0], 'WAVE', 'fmt '))).toBeNull()
  })

  it('refuses empty and truncated input without throwing', () => {
    expect(sniffImageType(new Uint8Array())).toBeNull()
    expect(sniffImageType(bytes([0xff, 0xd8]))).toBeNull()
    expect(sniffImageType(bytes('RIFF'))).toBeNull()
    expect(sniffImageType(bytes([0, 0, 0, 0x1c], 'ftyp'))).toBeNull()
  })
})

describe('withImageExtension', () => {
  it('forces the extension to match the detected type', () => {
    expect(withImageExtension('photo.html', 'image/png')).toBe('photo.png')
    expect(withImageExtension('photo.svg', 'image/jpeg')).toBe('photo.jpg')
    expect(withImageExtension('panel.upgrade.JPEG', 'image/jpeg')).toBe('panel.upgrade.jpg')
    expect(withImageExtension('no-extension', 'image/webp')).toBe('no-extension.webp')
  })

  it('falls back to a usable name', () => {
    expect(withImageExtension('', 'image/gif')).toBe('image.gif')
    expect(withImageExtension('.png', 'image/png')).toBe('image.png')
  })
})
