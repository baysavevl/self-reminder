import { describe, expect, it } from 'vitest'
import { resolveLoginIdentifier } from './auth'

describe('login identifier', () => {
  it('maps the app username vinh to the owner email', () => {
    expect(resolveLoginIdentifier(' vinh ')).toBe('luuvinh8698@gmail.com')
  })
  it('keeps normal email login unchanged', () => {
    expect(resolveLoginIdentifier('luuvinh8698@gmail.com')).toBe('luuvinh8698@gmail.com')
  })
})
