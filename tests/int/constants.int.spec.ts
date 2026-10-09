import { describe, expect, it } from 'vitest'

import {
  fillTemplate,
  isStudioPermission,
  isTemplateKind,
  timeAgo,
} from '@/studio/constants'

describe('fillTemplate', () => {
  it('substitutes name and business placeholders', () => {
    expect(fillTemplate('Hi {{name}}, thanks from {{business}}', { name: 'Ann', business: '911' })).toBe(
      'Hi Ann, thanks from 911',
    )
  })

  it('falls back gracefully when values are missing', () => {
    expect(fillTemplate('Hi {{name}}', {})).toBe('Hi there')
  })
})

describe('permission/template guards', () => {
  it('validates studio permissions', () => {
    expect(isStudioPermission('leads')).toBe(true)
    expect(isStudioPermission('superuser')).toBe(false)
  })

  it('validates template kinds', () => {
    expect(isTemplateKind('review')).toBe(true)
    expect(isTemplateKind('nope')).toBe(false)
  })
})

describe('timeAgo', () => {
  it('returns empty for nullish input', () => {
    expect(timeAgo(null)).toBe('')
  })

  it('describes a recent time', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now')
  })
})
